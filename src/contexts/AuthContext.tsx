
"use client";

import type { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { loadUsers as loadUsersAction, saveUsers as saveUsersAction } from "@/actions/userActions";
import { loadSettings as loadSettingsAction } from "@/actions/settingsActions";

type LoginResultReason = 'locked' | 'invalid_credentials' | 'generic_error' | 'maintenance';

interface LoginResult {
  success: boolean;
  reason?: LoginResultReason;
}

interface AuthContextType {
  user: User | null;
  login: (usernameInput: string, passwordInput: string) => Promise<LoginResult>;
  loginWithPasskey: (user: User) => Promise<LoginResult>;
  logout: () => void;
  loading: boolean; 
  isAuthenticated: boolean;
  isAdmin: boolean;
  updateUserInContext: (updatedUser: User) => Promise<void>; 
  allUsers: User[]; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      const usersFromFile = await loadUsersAction();
      setAllUsers(usersFromFile);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({ title: "Error", description: "Could not load user data.", variant: "destructive" });
      setAllUsers([]); 
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllUsers(); 

    const storedUser = localStorage.getItem("roboconUser");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser); 
      } catch (e) {
        console.error("Error parsing stored user:", e);
        localStorage.removeItem("roboconUser");
      }
    }
  }, [fetchAllUsers]);
  
  useEffect(() => {
    if (!loading && localStorage.getItem("roboconUser")) {
        const storedUserJson = localStorage.getItem("roboconUser");
        if (storedUserJson) {
            try {
                const storedUserData = JSON.parse(storedUserJson) as User;
                const validUser = allUsers.find(u => u.id === storedUserData.id && u.username === storedUserData.username);
                if (validUser) {
                    const { password, ...userToStore } = validUser;
                    setUser(userToStore);
                } else {
                    setUser(null);
                    localStorage.removeItem("roboconUser");
                }
            } catch(e) {
                console.error("Error re-validating stored user", e);
                setUser(null);
                localStorage.removeItem("roboconUser");
            }
        }
    }
  }, [allUsers, loading]);

  const handleSuccessfulLogin = (loggedInUser: User): LoginResult => {
    const { password, ...userToStore } = loggedInUser;
    setUser(userToStore);
    localStorage.setItem("roboconUser", JSON.stringify(userToStore));
    toast({ title: "Login Successful", description: `Welcome, ${userToStore.name}!` });
    router.push(userToStore.role === "admin" ? "/admin" : "/my-team");
    return { success: true };
  };

  const loginWithPasskey = async (loggedInUser: User): Promise<LoginResult> => {
     setLoading(true);
     try {
        const settings = await loadSettingsAction();
        if (settings.maintenanceMode && loggedInUser.role === 'participant') {
          toast({ title: "Maintenance Mode", description: "The portal is in maintenance. Participant logins are disabled.", variant: "destructive" });
          return { success: false, reason: 'maintenance' };
        }
        if (loggedInUser.status === 'locked') {
          return { success: false, reason: 'locked' };
        }
        return handleSuccessfulLogin(loggedInUser);
     } catch (error) {
        toast({ title: "Login Error", description: "An unexpected error occurred during passkey login.", variant: "destructive" });
        return { success: false, reason: 'generic_error' };
     } finally {
        setLoading(false);
     }
  };

  const login = async (usernameInput: string, passwordInput: string): Promise<LoginResult> => {
    setLoading(true);
    let currentUsers = allUsers;

    try {
        const settings = await loadSettingsAction();
        if (currentUsers.length === 0) {
            currentUsers = await loadUsersAction();
            setAllUsers(currentUsers);
        }
        
        await new Promise(resolve => setTimeout(resolve, 300)); 
        const foundUser = currentUsers.find(u => u.username === usernameInput && u.password === passwordInput);

        if (foundUser) {
          if (settings.maintenanceMode && foundUser.role === 'participant') {
              toast({ title: "Maintenance Mode", description: "The portal is in maintenance. Participant logins are disabled.", variant: "destructive" });
              setLoading(false);
              return { success: false, reason: 'maintenance' };
          }
          if (foundUser.status === 'locked') {
            setLoading(false);
            return { success: false, reason: 'locked' };
          }
          setLoading(false);
          return handleSuccessfulLogin(foundUser);
        } else {
          toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
          setUser(null); 
          setLoading(false);
          return { success: false, reason: 'invalid_credentials' };
        }
    } catch (error) {
        console.error("Failed to load users or settings during login:", error);
        toast({ title: "Login Error", description: "Could not verify credentials.", variant: "destructive" });
        setLoading(false);
        return { success: false, reason: 'generic_error' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("roboconUser");
    router.push("/login");
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  const updateUserInContext = async (updatedUser: User) => {
    const newAllUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    setAllUsers(newAllUsers);
    try {
        await saveUsersAction(newAllUsers); 
    } catch (error) {
        toast({ title: "Error", description: "Failed to save user updates.", variant: "destructive"});
        await fetchAllUsers(); 
        return;
    }

    if (user && user.id === updatedUser.id) {
      const { password, ...userToStore } = updatedUser;
      setUser(userToStore);
      localStorage.setItem("roboconUser", JSON.stringify(userToStore));
    }
  };
  
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, login, loginWithPasskey, logout, loading, isAuthenticated, isAdmin, updateUserInContext, allUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
