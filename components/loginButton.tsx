'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { UserRound, LogOut, Eye, EyeOff } from "lucide-react";
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
import { useWishlistEvents } from '@/lib/wishlist-events';

const formSchema = z.object({
  email: z.string().min(2, "Your Email has to be at least 2 characters long.").max(50, "Your Email can't exceed 50 characters.").email("Please enter a valid Email."),
  password: z.string().min(1, "Password is required"),
  urlEnding: z.string().min(3, "Your wish URL Ending has to be at least 3 characters long.").max(50, "Your wish URL Ending can't exceed 50 characters."),
});

type LoginSession = {
  isLoggedIn: boolean;
  urlEnding: string;
};

export function LoginButton({ currentUrlEnding }: { currentUrlEnding: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { emit } = useWishlistEvents();
  const [loginSession, setLoginSession] = useState<LoginSession>({
    isLoggedIn: false,
    urlEnding: ''
  });
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      urlEnding: currentUrlEnding,
    },
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/session');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.urlEnding === currentUrlEnding) {
            setLoginSession({ isLoggedIn: true, urlEnding: data.urlEnding });
          }
        }
      } catch {
        // Not authenticated
      }
    };

    checkSession();
  }, [currentUrlEnding]);

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLoginSession({ isLoggedIn: true, urlEnding: values.urlEnding });
        setDialogOpen(false);
        toast.success('Login successful! Reloading page...', {
          position: "top-right",
          autoClose: 2000,
        });

        reloadTimerRef.current = setTimeout(() => {
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

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // Continue with client-side logout even if API call fails
    }
    setLoginSession({ isLoggedIn: false, urlEnding: '' });
    toast.info('You have been logged out. Reloading page...', {
      position: "top-right",
      autoClose: 2000,
    });

    reloadTimerRef.current = setTimeout(() => {
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
              emit('prioritiesUpdated');
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
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Your password"
                            {...field}
                            className="bg-gray-700 border-gray-600 text-white pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
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