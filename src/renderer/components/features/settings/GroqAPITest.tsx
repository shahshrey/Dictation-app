import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { useAppContext } from '../../../context/AppContext';
import { rendererLogger } from '../../../../shared/preload-logger';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const GroqAPITest: React.FC = () => {
  const { settings } = useAppContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    text?: string;
  } | null>(null);

  const handleTestAPI = async () => {
    try {
      setIsLoading(true);
      setTestResult(null);
      
      rendererLogger.debug('Testing Groq API connection', { apiKeyAvailable: !!settings.apiKey });
      
      if (!settings.apiKey) {
        setTestResult({
          success: false,
          error: 'No API key provided. Please enter your Groq API key in the settings.'
        });
        return;
      }
      
      if (window.electronAPI && typeof window.electronAPI.testGroqAPI === 'function') {
        const result = await window.electronAPI.testGroqAPI(settings.apiKey);
        rendererLogger.debug('Groq API test result', { success: result.success });
        setTestResult(result);
      } else {
        rendererLogger.error('testGroqAPI function not available');
        setTestResult({
          success: false,
          error: 'API test function not available. This is likely a bug.'
        });
      }
    } catch (error) {
      rendererLogger.exception(error as Error, 'Error testing Groq API');
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Groq API Connection Test</CardTitle>
        <CardDescription>
          Test your Groq API connection to ensure transcription will work properly
        </CardDescription>
      </CardHeader>
      <CardContent>
        {testResult && (
          <Alert className={`mb-4 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <AlertTitle>
                {testResult.success ? 'Connection Successful' : 'Connection Failed'}
              </AlertTitle>
            </div>
            <AlertDescription className="mt-2">
              {testResult.success 
                ? testResult.message || 'Your Groq API key is working correctly.'
                : testResult.error || 'Failed to connect to Groq API.'}
            </AlertDescription>
            
            {testResult.success && testResult.text && (
              <div className="mt-4 p-3 bg-white rounded border border-green-200">
                <p className="text-sm font-medium text-gray-700">Sample Transcription:</p>
                <p className="text-sm text-gray-600 mt-1">{testResult.text}</p>
              </div>
            )}
          </Alert>
        )}
        
        <div className="text-sm text-gray-500 mb-4">
          <p>This test will verify that your Groq API key is valid and that the app can successfully connect to the Groq API for transcription.</p>
          <p className="mt-2">If the test fails, please check your API key and internet connection.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleTestAPI} 
          disabled={isLoading || !settings.apiKey}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            'Test Groq API Connection'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GroqAPITest; 

