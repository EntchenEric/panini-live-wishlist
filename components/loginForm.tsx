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

const formSchema = z.object({
    email: z.string().min(2, "Your Email has to be at least 2 characters long.").max(50, "Your Email can't exeed 50 characters.").email("Please enter a valid Email."),
    password: z.string().min(2, "Your Password has to be at least 2 characters long.").max(50, "Your Password can't exeed 50 cahracters."),
    urlEnding: z.string().min(3, "Your wish URL Ending has to be at least 3 characters long.").max(50, "Your wish URL Ending can't exeed 50 characters."),
})

export function LoginForm() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
            urlEnding: "",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values)
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
                                <Input placeholder="your@mail.com" {...field} />
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
                                <Input placeholder="password123" {...field} />
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
                                url Ending
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="wishlist" {...field} />
                            </FormControl>
                            <FormDescription>
                                The URL Ending you wish to have. This will be panini.entcheneric.com/[urlEnding]
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />

                <Button variant="secondary" className=" cursor-pointer">
                    Create sharable wishlist
                </Button>
            </form>
        </Form>
    )
}