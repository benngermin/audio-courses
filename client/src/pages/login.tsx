import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, Sparkles, BookOpen, Headphones, Brain } from "lucide-react";
import logoUrl from '@assets/image_1756245208467.png';

export default function Login() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setIsSuccess(false);

    try {
      const data = await apiRequest("POST", "/api/auth/request-magic-link", { email });
      
      if (data.ok) {
        setIsSuccess(true);
      } else {
        throw new Error(data.message || "Failed to send magic link");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send magic link. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <img src={logoUrl} alt="Audio Courses Logo" className="h-16 w-16" />
            </div>
            <CardTitle className="text-2xl text-center">Welcome to Audio Courses</CardTitle>
            <CardDescription className="text-center">
              Enter your email to receive a magic link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className="h-11"
                    data-testid="input-email"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11" 
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Magic Link
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <Alert className="bg-green-50 border-green-200">
                <Mail className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Check your email!</strong><br />
                  We've sent a magic link to <strong>{email}</strong>.<br />
                  Click the link in the email to log in.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-muted/30 px-8">
        <div className="max-w-md">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 rounded-2xl">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center">Learn by Listening</h2>
            <p className="text-muted-foreground text-center text-lg">
              Transform your educational materials into audio content and learn on the go
            </p>
            <div className="space-y-4 pt-4">
              <div className="flex items-start space-x-3">
                <BookOpen className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">Convert to Audio</p>
                  <p className="text-sm text-muted-foreground">Turn PDFs and documents into high-quality audio</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Headphones className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">Listen Anywhere</p>
                  <p className="text-sm text-muted-foreground">Learn while commuting, exercising, or relaxing</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Brain className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">Boost Retention</p>
                  <p className="text-sm text-muted-foreground">Enhance learning through auditory processing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}