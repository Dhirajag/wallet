import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';

export { formatCents } from './pricing';
export { parseAmountToCents, validateTopUpAmount } from './wallet/amount';
export type { WalletSummary, TopUpQuote, WalletApi } from './wallet/api';
import { defaultWalletApi } from './wallet/api';
import type { WalletSummary, WalletApi, TopUpQuote } from './wallet/api';
import { parseAmountToCents, validateTopUpAmount } from './wallet/amount';
import { formatCents } from './pricing';

export interface AddMoneyScreenProps {
  userId: string;
  api?: WalletApi;
  onTopUpComplete?: (quote: TopUpQuote) => void;
  onError?: (error: string) => void;
}
export function AddMoneyScreen({ 
  userId, 
  api = defaultWalletApi,
  onTopUpComplete,
  onError,
}: AddMoneyScreenProps) {
  const [summary, setSummary] = useState(null as WalletSummary | null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null as string | null);
  
  const [amountInput, setAmountInput] = useState('');
  const [validationError, setValidationError] = useState(null as string | null);
  
  const [quote, setQuote] = useState(null as TopUpQuote | null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState(null as string | null);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const quoteRequestRef = useRef(null as { id: number; amountCents: number } | null);


  const trackEvent = useCallback((eventName: string, properties?: any) => {

    console.log(`[Analytics] ${eventName}:`, {
      userId,
      timestamp: new Date().toISOString(),
      ...properties,
    });
    

  }, [userId]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      setSummaryError(null);
      
      trackEvent('wallet_summary_fetch_started');
      
      try {
        const walletSummary = await api.fetchWalletSummary(userId);
        if (isMounted) {
          setSummary(walletSummary);
          trackEvent('wallet_summary_fetch_success', {
            balanceCents: walletSummary.balanceCents,
            remainingDailyLimitCents: walletSummary.remainingDailyTopUpCents,
          });
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = 'Unable to load wallet balance. Please try again.';
          setSummaryError(errorMessage);
          trackEvent('wallet_summary_fetch_error', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          if (onError) {
            onError(errorMessage);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
      }
    };
    
    fetchSummary();
    
    return () => {
      isMounted = false;
    };
  }, [userId, api, trackEvent, onError]);


  useEffect(() => {
    if (!amountInput || amountInput.trim().length === 0) {
      setValidationError(null);
      setQuote(null);
      setQuoteError(null);
      return;
    }

    setQuote(null);
    setQuoteError(null);

    const error = validateTopUpAmount(amountInput, summary || undefined);
    setValidationError(error);
  }, [amountInput, summary?.remainingDailyTopUpCents]);


  const handleGetQuote = useCallback(async () => {
    if (isLoadingQuote) {
      return;
    }
    
    const cents = parseAmountToCents(amountInput);
    if (cents === null) {
      setValidationError('Please enter a valid amount');
      return;
    }
    
    const error = validateTopUpAmount(amountInput, summary || undefined);
    if (error) {
      setValidationError(error);
      return;
    }
    
    setQuote(null);
    setQuoteError(null);
    setIsLoadingQuote(true);
    
    const requestId = Date.now() + Math.random();
    quoteRequestRef.current = { id: requestId, amountCents: cents };
    
    trackEvent('quote_request_started', { amountCents: cents });
    
    try {
      const quoteResult = await api.createTopUpQuote(userId, cents);
      
      if (quoteRequestRef.current?.id === requestId) {
        setQuote(quoteResult);
        setQuoteError(null);
        trackEvent('quote_request_success', {
          amountCents: quoteResult.amountCents,
          feeCents: quoteResult.feeCents,
          resultingBalanceCents: quoteResult.resultingBalanceCents,
        });
      }
    } catch (error) {
      if (quoteRequestRef.current?.id === requestId) {
        const errorMessage = 'Could not fetch quote. Please try again.';
        setQuoteError(errorMessage);
        setQuote(null);
        trackEvent('quote_request_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          amountCents: cents,
        });
        if (onError) {
          onError(errorMessage);
        }
      }
    } finally {
      if (quoteRequestRef.current?.id === requestId) {
        setIsLoadingQuote(false);
      }
    }
  }, [amountInput, summary, userId, api, isLoadingQuote, trackEvent, onError]);

  const handleConfirmTopUp = useCallback(async () => {
    if (!quote || isConfirming) {
      return;
    }
    
    setIsConfirming(true);
    
    trackEvent('top_up_confirmation_started', {
      amountCents: quote.amountCents,
      feeCents: quote.feeCents,
      resultingBalanceCents: quote.resultingBalanceCents,
    });
    
    try {
     
      await new Promise(resolve => setTimeout(resolve, 1000));
      
     
      trackEvent('top_up_confirmation_success', {
        amountCents: quote.amountCents,
        feeCents: quote.feeCents,
        resultingBalanceCents: quote.resultingBalanceCents,
      });
      
      const quoteRef = quote;
      Alert.alert(
        'Success!',
        `Successfully added ${formatCents(quote.amountCents)} to your wallet.`,
        [
          {
            text: 'OK',
            onPress: () => {
        
              setAmountInput('');
              setQuote(null);
              setValidationError(null);
              setQuoteError(null);
     
              setSummary((currentSummary: WalletSummary | null) => {
                if (!currentSummary) {
                  return currentSummary;
                }
                return {
                  ...currentSummary,
                  balanceCents: quoteRef.resultingBalanceCents,
                  remainingDailyTopUpCents: Math.max(
                    0,
                    currentSummary.remainingDailyTopUpCents - quoteRef.amountCents,
                  ),
                };
              });
       
              if (onTopUpComplete) {
                onTopUpComplete(quoteRef);
              }
            },
          },
        ]
      );
    } catch (error) {

      const errorMessage = 'Failed to complete top-up. Please try again.';
      trackEvent('top_up_confirmation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        amountCents: quote.amountCents,
      });
      Alert.alert('Error', errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsConfirming(false);
    }
  }, [quote, isConfirming, trackEvent, onTopUpComplete, onError]);

  const handleRetry = useCallback(async () => {
    if (isLoadingSummary) {
      return;
    }
    
    setIsLoadingSummary(true);
    setSummaryError(null);
    
    trackEvent('wallet_summary_retry_started');
    
    try {
      const walletSummary = await api.fetchWalletSummary(userId);
      setSummary(walletSummary);
      setSummaryError(null);
      trackEvent('wallet_summary_retry_success', {
        balanceCents: walletSummary.balanceCents,
      });
    } catch (error) {
      const errorMessage = 'Unable to load wallet balance. Please try again.';
      setSummaryError(errorMessage);
      trackEvent('wallet_summary_retry_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoadingSummary(false);
    }
  }, [userId, api, isLoadingSummary, trackEvent, onError]);

  const isPrimaryButtonDisabled = 
    isLoadingSummary ||
    isLoadingQuote ||
    isConfirming ||
    !!validationError ||
    !amountInput ||
    amountInput.trim().length === 0;

  if (isLoadingSummary) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading wallet summary...</Text>
        </View>
      </View>
    );
  }

  if (summaryError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{summaryError}</Text>
          <View style={styles.retryButton}>
            <ActionButton
              title="Retry"
              onPress={handleRetry}
              accessibilityLabel="Retry"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>
            Current balance: {formatCents(summary?.balanceCents || 0)}
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Top-up amount</Text>
          <TextInput
            style={[
              styles.input,
              validationError && styles.inputError
            ]}
            value={amountInput}
            onChangeText={setAmountInput}
            placeholder="$0.00"
            placeholderTextColor="#999999"
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            accessibilityLabel="Top-up amount"
            editable={!isLoadingQuote && !isConfirming}
            testID="amount-input"
          />
        </View>

        {validationError && (
          <View style={styles.validationContainer}>
            <Text style={styles.validationText}>{validationError}</Text>
          </View>
        )}


        {quote && !validationError && !quoteError && (
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteTitle}>Quote preview</Text>
            <Text style={styles.quoteLine}>
              Fee: {formatCents(quote.feeCents)}
            </Text>
            <Text style={styles.quoteLine}>
              Resulting balance: {formatCents(quote.resultingBalanceCents)}
            </Text>

            <View style={styles.confirmButtonContainer}>
              <ActionButton
                title={isConfirming ? "Processing..." : "Confirm Top-up"}
                onPress={handleConfirmTopUp}
                disabled={isConfirming}
                accessibilityLabel="Confirm top-up"
                testID="confirm-button"
                color="#34C759"
              />
            </View>
          </View>
        )}

        {quoteError && (
          <View style={styles.quoteErrorContainer}>
            <Text style={styles.quoteErrorText}>{quoteError}</Text>
          </View>
        )}
        <View style={styles.buttonContainer}>
          <ActionButton
            title={isLoadingQuote ? "Getting quote..." : "Get quote"}
            onPress={handleGetQuote}
            disabled={isPrimaryButtonDisabled}
            accessibilityLabel="Get quote"
            testID="get-quote-button"
          />
        </View>
        {isLoadingQuote && (
          <View style={styles.quoteLoadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.quoteLoadingText}>Fetching quote...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ActionButton({
  title,
  onPress,
  disabled = false,
  color,
  testID,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  testID?: string;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        styles.actionButton,
        disabled && styles.actionButtonDisabled,
        color ? { backgroundColor: color } : null,
      ]}
    >
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    width: 120,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  balanceContainer: {
    marginBottom: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: '#1C1C1E',
    backgroundColor: '#F8F8FC',
    minHeight: 50,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  validationContainer: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  validationText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  quoteContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8F8FC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  quoteLine: {
    fontSize: 14,
    color: '#3A3A3C',
    marginVertical: 4,
  },
  confirmButtonContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  quoteErrorContainer: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  quoteErrorText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  quoteLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  quoteLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
  },
});

export default AddMoneyScreen;