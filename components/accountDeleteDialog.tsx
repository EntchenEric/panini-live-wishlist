'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'react-toastify'

interface AccountDeleteDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    accountEmail: string
    onConfirmDelete: (password: string) => Promise<void>
}

export function AccountDeleteDialog({
    open,
    onOpenChange,
    onConfirmDelete,
}: AccountDeleteDialogProps) {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!password) {
            return
        }
        setLoading(true)
        try {
            await onConfirmDelete(password)
            onOpenChange(false)
            toast.success('Account deleted successfully.', { autoClose: 3000 })
        } catch (error) {
            setPassword('')
            const message = error instanceof Error ? error.message : 'Failed to delete account. Please try again.'
            toast.error(message, { autoClose: 5000 })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-800 text-white">
                <DialogHeader>
                    <DialogTitle>Delete Your Account</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        This will permanently delete your account and all wishlist data.
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <Label htmlFor="password">
                        Enter your password to confirm
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                    />
                    <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-sm text-red-200">
                        ⚠️ This will delete:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Your account credentials</li>
                            <li>All wishlist items</li>
                            <li>URL ending customization</li>
                            <li>All saved notes and dependencies</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false)
                            setPassword('')
                        }}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading || !password}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {loading ? 'Deleting...' : 'Delete Account'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
