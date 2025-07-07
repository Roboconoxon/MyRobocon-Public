"use client";

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/types';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmNewPassword: z.string().min(6, "Please confirm your new password"),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"], 
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ isOpen, onOpenChange }: ChangePasswordDialogProps) {
  const { user: authUser, allUsers, updateUserInContext } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setIsLoading(false);
    }
  }, [isOpen, reset]);

  const onSubmit: SubmitHandler<PasswordChangeFormValues> = async (data) => {
    setIsLoading(true);
    if (!authUser) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const currentUserFromList = allUsers.find(u => u.id === authUser.id);

    if (!currentUserFromList || !currentUserFromList.password) {
      toast({ title: "Error", description: "Could not verify current user data.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    
    if (currentUserFromList.password !== data.currentPassword) {
      toast({ title: "Incorrect Password", description: "The current password you entered is incorrect.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (data.newPassword === data.currentPassword) {
      toast({ title: "Password Unchanged", description: "New password cannot be the same as the current password.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const updatedUser: User = {
      ...currentUserFromList,
      password: data.newPassword,
    };

    try {
      await updateUserInContext(updatedUser);
      toast({ title: "Password Changed", description: "Your password has been successfully updated." });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update password. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!authUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            Enter your current password and a new password below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              {...register("currentPassword")}
              disabled={isLoading}
            />
            {errors.currentPassword && <p className="text-sm text-destructive mt-1">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              {...register("newPassword")}
              placeholder="Min. 6 characters"
              disabled={isLoading}
            />
            {errors.newPassword && <p className="text-sm text-destructive mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              {...register("confirmNewPassword")}
              disabled={isLoading}
            />
            {errors.confirmNewPassword && <p className="text-sm text-destructive mt-1">{errors.confirmNewPassword.message}</p>}
          </div>
        
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save New Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
