import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "@/components/loginForm";
import { Separator } from "@/components/ui/separator";
import { Book, ShieldAlert, Lock, ShieldQuestion } from "lucide-react";

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
              Panini only allows you to share your wishlist via email, which isn&apos;t live-updating.
              I wanted a wishlist I can share with my family that always reflects my latest purchases.
              This way, if I buy a comic myself, they won&apos;t accidentally buy the same one as a gift.
            </p>
          </div>

          <Alert className="mb-6 bg-yellow-800/80 p-4 rounded-2xl text-white border border-yellow-600 shadow-md">
            <AlertTitle className="text-white font-bold">
              <ShieldAlert className="inline-block mr-2" /> Login Delay
            </AlertTitle>
            <AlertDescription className="text-gray-200">
              Login can take up to 10 seconds. If it takes longer, try again or reach out on Discord (@entcheneric) or email (eseidel2004@gmail.com).
            </AlertDescription>
          </Alert>

          <Alert className="mb-6 bg-red-900/80 p-4 rounded-2xl text-white border border-red-600 shadow-md">
            <AlertTitle className="text-white font-bold">
              <ShieldAlert className="inline-block mr-2" /> Security Notice
            </AlertTitle>
            <AlertDescription className="text-gray-200">
              Your Panini password is stored encrypted but could be decrypted. <strong>Only use this if your Panini account has no sensitive payment data.</strong>
              <br />
              <Lock className="inline-block mr-2 mt-1" />I will never view your password or personal data.
            </AlertDescription>
          </Alert>

          <div className="mb-6">
            <LoginForm />
          </div>

          <Separator className="my-6 bg-gray-700" />

          <p className="text-center text-gray-500 text-sm">
            After logging in, you can manage your account settings including changing your password or deleting your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}