import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/loginForm";
import { Separator } from "@/components/ui/separator";
import { Trash, Key, Link, Book, ShieldAlert, Lock, ShieldQuestion } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 px-6">
      <Card className="w-full max-w-2xl shadow-xl border border-gray-800 rounded-3xl bg-gray-900 text-white p-8">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-extrabold text-gray-100">
            <Book className="inline-block mr-2" /> Panini Wishlist
          </CardTitle>
          <p className="text-gray-400 text-lg mt-2">
            Keep your wishlist always up-to-date and share it effortlessly.
          </p>
        </CardHeader>

        <CardContent>
          <div className="mb-6 p-6 bg-gray-800 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-100 mb-2">
              <ShieldQuestion className="inline-block mr-2" /> Why This Exists
            </h2>
            <p className="text-gray-400">
              Panini only allows you to share your wishlist via email, which isn’t live-updating.
              I wanted a wishlist I can share with my family that always reflects my latest purchases.
              This way, if I buy a comic myself, they won’t accidentally buy the same one as a gift.
            </p>
          </div>

          {/* Note about possible login delay */}
          <Alert className="mb-6 bg-yellow-800/80 p-5 rounded-2xl text-white border border-yellow-600 shadow-md">
            <AlertTitle className="text-white font-bold">
              <ShieldAlert className="inline-block mr-2" /> Login Delay Notice
            </AlertTitle>
            <AlertDescription className="text-gray-200">
              <span>
                The login might take up to 10 seconds. Please be patient while we authenticate your account.
                If it takes longer, you can try again or contact support.
              </span>
            </AlertDescription>
          </Alert>

          <Alert className="mb-6 bg-red-900/80 p-5 rounded-2xl text-white border border-red-600 shadow-md">
            <AlertTitle className="text-white font-bold">
              <ShieldAlert className="inline-block mr-2" /> Security Warning
            </AlertTitle>
            <AlertDescription className="text-gray-200">
              <span>
                Your Panini password is stored in a way that allows us to see it. While encrypted, it’s not fully secure.
                <strong> Only use this if your Panini account has no sensitive payment data. </strong>
                <br /><br />
                <Lock className="inline-block mr-2" /> <strong>Note:</strong> We will <u>never</u> view your password or any other personal data.
              </span>
            </AlertDescription>
          </Alert>

          <div className="mb-6">
            <LoginForm />
          </div>

          <Separator className="my-6 bg-gray-700" />

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <Button
              variant="destructive"
              className="flex-1 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 active:bg-red-600"
            >
              <Trash className="inline-block mr-2" /> Delete Account
            </Button>
            <Button
              variant="secondary"
              className="flex-1 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-600"
            >
              <Key className="inline-block mr-2" /> Change Password
            </Button>
            <Button
              variant="secondary"
              className="flex-1 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:bg-green-600"
            >
              <Link className="inline-block mr-2" /> Edit URL
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
