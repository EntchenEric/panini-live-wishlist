'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { UserRound, LogOut } from "lucide-react";
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BulkPriorityManager } from "@/components/BulkPriorityManager";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  email: z.string().min(2, "Your Email has to be at least 2 characters long.").max(50, "Your Email can't exceed 50 characters.").email("Please enter a valid Email."),
  password: z.string().min(2, "Your Password has to be at least 2 characters long.").max(50, "Your Password can't exceed 50 characters."),
  urlEnding: z.string().min(3, "Your wish URL Ending has to be at least 3 characters long.").max(50, "Your wish URL Ending can't exceed 50 characters."),
});

type LoginSession = {
  isLoggedIn: boolean;
  urlEnding: string;
};

export function LoginButton({ currentUrlEnding }: { currentUrlEnding: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginSession, setLoginSession] = useState<LoginSession>({
    isLoggedIn: false,
    urlEnding: ''
  });
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      urlEnding: currentUrlEnding,
    },
  });

  useEffect(() => {
    const checkLoginStatus = () => {
      const savedSession = localStorage.getItem('loginSession');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession) as LoginSession;
          if (session.isLoggedIn && session.urlEnding === currentUrlEnding) {
            setLoginSession(session);
          }
        } catch (error) {
          console.error('Error parsing login session:', error);
          localStorage.removeItem('loginSession');
        }
      }
    };
    
    checkLoginStatus();
  }, [currentUrlEnding]);

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const session = {
          isLoggedIn: true,
          urlEnding: values.urlEnding,
        };
        localStorage.setItem('loginSession', JSON.stringify(session));
        setLoginSession(session);
        setDialogOpen(false);
        toast.success('Login successful! Reloading page...', {
          position: "top-right",
          autoClose: 2000,
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(data.message || 'Login failed', {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login.', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('loginSession');
    setLoginSession({
      isLoggedIn: false,
      urlEnding: ''
    });
    toast.info('You have been logged out. Reloading page...', {
      position: "top-right",
      autoClose: 2000,
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <>
      {loginSession.isLoggedIn ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Logged in</span>
          <BulkPriorityManager 
            urlEnding={currentUrlEnding}
            onPrioritiesChanged={() => {
              window.dispatchEvent(new CustomEvent('prioritiesUpdated'));
            }} 
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none"
            >
              <UserRound className="h-4 w-4 mr-2" />
              Login
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 text-white border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-100">Login to your account</DialogTitle>
              <DialogDescription className="text-gray-300">
                Enter your Panini account details to manage your wishlist.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="your@email.com" 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Your password" 
                          {...field} 
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urlEnding"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">URL Ending</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="wishlist" 
                          {...field}
                          disabled={true}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 