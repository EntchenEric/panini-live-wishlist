'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useRouter } from "next/navigation" // Import useRouter

const formSchema = z.object({
    email: z.string().min(2, "Your Email has to be at least 2 characters long.").max(50, "Your Email can't exeed 50 characters.").email("Please enter a valid Email."),
    password: z.string().min(2, "Your Password has to be at least 2 characters long.").max(50, "Your Password can't exeed 50 cahracters."),
    urlEnding: z.string().min(3, "Your wish URL Ending has to be at least 3 characters long.").max(50, "Your wish URL Ending can't exeed 50 characters."),
})

export function LoginForm() {
    const [errorMessage, setErrorMessage] = useState<string>("")
    const router = useRouter() // Initialize useRouter

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
            urlEnding: "",
        },
    })

    const createUser = async (email: string, password: string, urlEnding: string) => {
        try {
            const response = await fetch("/api/create_user?email=" + email + "&password=" + password + "&urlEnding=" + urlEnding, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const data = await response.json()

            if (response.ok) {
                // Redirect to the URL upon success
                router.push(`/${urlEnding}`)
            } else {
                // Set error message if the API returns an error
                setErrorMessage(data.message || "Something went wrong.")
            }
        } catch (error) {
            // Handle network errors
            setErrorMessage("An unexpected error occurred.")
        }
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values)
        createUser(values.email, values.password, values.urlEnding)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                E-Mail
                            </FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="your@mail.com" 
                                    {...field} 
                                    className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-gray-800 text-white selection:bg-blue-500 selection:text-white"
                                />
                            </FormControl>
                            <FormDescription>
                                Enter the Email you use to log in to panini.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Password
                            </FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="password123" 
                                    {...field} 
                                    className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-gray-800 text-white selection:bg-blue-500 selection:text-white"
                                />
                            </FormControl>
                            <FormDescription>
                                Enter the Password you use to log in to panini.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />

                <FormField
                    control={form.control}
                    name="urlEnding"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                URL Ending
                            </FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="wishlist" 
                                    {...field} 
                                    className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-gray-800 text-white selection:bg-blue-500 selection:text-white"
                                />
                            </FormControl>
                            <FormDescription>
                                The URL Ending you wish to have. This will be panini.entcheneric.com/[urlEnding]
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />

                {errorMessage && (
                    <div className="text-red-500 mt-4">{errorMessage}</div>
                )}

                <Button 
                    variant="secondary" 
                    className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-600"
                >
                    Create sharable wishlist
                </Button>
            </form>
        </Form>
    )
}
