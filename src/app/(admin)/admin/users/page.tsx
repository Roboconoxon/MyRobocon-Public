
"use client";

import { useState, ChangeEvent, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { PlusCircle, Edit3, Trash2, Upload, Download, KeyRound, Search, Loader2, InfoIcon, ChevronDown } from "lucide-react";
import type { User, UserRole, Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUsers, saveUsers } from "@/actions/userActions";
import { loadTeams } from "@/actions/teamActions"; 
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertTitle, AlertDescription as UiAlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const defaultUser: User = { id: "", username: "", name: "", email: "", role: "participant", status: "active", teamId: undefined };

const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

const usersToCSV = (usersData: User[]): string => {
  const headers = ['id', 'username', 'name', 'email', 'role', 'status', 'teamId']; 
  const headerRow = headers.map(escapeCsvField).join(',');
  const dataRows = usersData.map(user => 
    headers.map(header => escapeCsvField(user[header as keyof Omit<User, 'password'>])).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
};

const parseUsersCSV = (csvText: string): User[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error("CSV must contain headers and at least one data row.");

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').replace(/^\ufeff/, '')); 
  const users: User[] = [];

  const requiredHeaders = ['username', 'name', 'role', 'status'];
  for (const reqHeader of requiredHeaders) {
    if (!headers.includes(reqHeader)) {
      throw new Error(`Missing required CSV header: ${reqHeader}`);
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const userObject: Partial<User> = {};
    headers.forEach((header, index) => {
      (userObject as any)[header] = values[index] || "";
    });

    if (!userObject.username || !userObject.name || !userObject.role || !userObject.status) {
        console.warn(`Skipping row ${i+1} due to missing required fields.`);
        continue;
    }
    if (!['admin', 'participant'].includes(userObject.role)) {
        console.warn(`Skipping row ${i+1} due to invalid role: ${userObject.role}. Defaulting to participant.`);
        userObject.role = 'participant';
    }
    if (!['active', 'locked'].includes(userObject.status)) {
        console.warn(`Skipping row ${i+1} due to invalid status: ${userObject.status}. Defaulting to active.`);
        userObject.status = 'active';
    }

    users.push({
      id: userObject.id || `imported_user_${Date.now()}_${i}`,
      username: userObject.username,
      name: userObject.name,
      email: userObject.email || undefined,
      role: userObject.role as UserRole,
      status: userObject.status as "active" | "locked",
      teamId: userObject.teamId || undefined,
      password: "imported_user_needs_reset" 
    });
  }
  return users;
};


export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [newPassword, setNewPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [csvFileToImport, setCsvFileToImport] = useState<File | null>(null);
  const { updateUserInContext, user: authUser } = useAuth();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkSetPasswordModalOpen, setIsBulkSetPasswordModalOpen] = useState(false);
  const [bulkNewPassword, setBulkNewPassword] = useState("");


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedUsers, loadedTeams] = await Promise.all([
        loadUsers(),
        loadTeams()
      ]);
      setUsers(loadedUsers);
      setAvailableTeams(loadedTeams);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load user or team data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateNew = () => {
    setIsEditing(false);
    setCurrentUser(defaultUser);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setIsEditing(true);
    setCurrentUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.username === 'admin' && users.filter(u => u.role === 'admin').length === 1) {
        toast({ title: "Action Denied", description: "Cannot delete the only admin user.", variant: "destructive"});
        return;
    }
    if (authUser && authUser.id === userId) {
        toast({ title: "Action Denied", description: "Cannot delete your own currently logged-in account.", variant: "destructive" });
        return;
    }
    const updatedUsers = users.filter(user => user.id !== userId);
    try {
      await saveUsers(updatedUsers);
      setUsers(updatedUsers); 
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
      toast({ title: "User Deleted", description: "The user has been successfully deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    }
  };

  const handleSaveUser = async () => {
    if (!currentUser.username || !currentUser.name) {
      toast({ title: "Error", description: "Username and Name are required.", variant: "destructive" });
      return;
    }
    
    let updatedUsers;
    let userToSave = { ...currentUser };

    if (isEditing) {
      updatedUsers = users.map(user => (user.id === userToSave.id ? userToSave : user));
    } else {
      if (!currentUser.password || currentUser.password.length < 6) {
        toast({ title: "Password Required", description: "A password of at least 6 characters is required for new users.", variant: "destructive" });
        return;
      }
      userToSave = { ...userToSave, id: `user_${Date.now()}` };
      updatedUsers = [...users, userToSave];
    }

    try {
      await saveUsers(updatedUsers);
      setUsers(updatedUsers);
      if (authUser && authUser.id === userToSave.id) { 
        await updateUserInContext(userToSave); 
      }
      toast({ title: isEditing ? "User Updated" : "User Created", description: `${userToSave.username} has been ${isEditing ? 'updated' : 'created'}.` });
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save user.", variant: "destructive" });
    }
  };

  const handleOpenPasswordModal = (user: User) => {
    setCurrentUser(user);
    setNewPassword("");
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
        toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
        return;
    }
    const userToUpdate = { ...currentUser, password: newPassword };
    
    try {
      // We need to pass the full user object to updateUserInContext
      await updateUserInContext(userToUpdate); 
      // updateUserInContext will internally call saveUsers and update local 'users' state via fetchAllUsers or by setting 'allUsers'
      // For immediate reflection without waiting for potential re-fetch from AuthContext:
      setUsers(prevUsers => prevUsers.map(u => u.id === currentUser.id ? userToUpdate : u));
      
      toast({ title: "Password Changed", description: `Password for ${currentUser.username} has been updated.` });
      setIsPasswordModalOpen(false);
      setNewPassword("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to change password.", variant: "destructive" });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentUser(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setCurrentUser(prev => ({ ...prev, role: value as UserRole }));
  };

  const handleStatusChange = (value: string) => {
    setCurrentUser(prev => ({ ...prev, status: value as "active" | "locked" }));
  };
  
  const handleTeamAssignmentChange = (teamIdValue: string) => {
    const teamId = teamIdValue === "none" ? undefined : teamIdValue;
    const selectedTeam = availableTeams.find(t => t.id === teamId);
    
    setCurrentUser(prev => ({
      ...prev,
      teamId,
      // If user is a participant and has no email, default to team's contact email.
      email: (prev.role === 'participant' && !prev.email) 
             ? (selectedTeam?.contactEmail || '') 
             : (prev.email || '')
    }));
  };

  const handleResetEmailToTeamDefault = () => {
    if (!currentUser.teamId) {
      toast({ title: "No Team Selected", description: "This user is not assigned to a team.", variant: "destructive" });
      return;
    }
    const team = availableTeams.find(t => t.id === currentUser.teamId);
    if (team && team.contactEmail) {
      setCurrentUser(prev => ({ ...prev, email: team.contactEmail }));
      toast({ title: "Email Reset", description: `Email has been reset to ${team.contactEmail}.` });
    } else {
      toast({ title: "No Contact Email", description: "The assigned team does not have a contact email set.", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    const csvData = usersToCSV(users);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'users_export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: "Users data exported to CSV." });
    } else {
      toast({ title: "Export Failed", description: "Your browser does not support this feature.", variant: "destructive" });
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFileToImport(file);
      setIsImportConfirmOpen(true);
      event.target.value = ''; 
    }
  };

  const processImport = () => {
    if (!csvFileToImport) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const importedUsers = parseUsersCSV(text);
        
        await saveUsers(importedUsers);
        setUsers(importedUsers); 
        setSelectedUserIds([]);
        
        if (authUser) { 
            const currentAuthUserAfterImport = importedUsers.find(u => u.id === authUser.id);
            if(currentAuthUserAfterImport) {
                await updateUserInContext(currentAuthUserAfterImport);
            } else {
                // Consider logging out the user if their account was removed by import
                 toast({ title: "Account Updated", description: "Your user data might have changed. Please review.", variant: "default" });
                 // router.push('/login'); // Or force logout
            }
        }
        toast({ title: "Import Successful", description: `${importedUsers.length} users imported and replaced existing data. Passwords for new/imported users may need to be set manually.` });
      } catch (error: any) {
        toast({ title: "Import Failed", description: error.message || "Could not parse CSV file.", variant: "destructive" });
      }
    };
    reader.onerror = () => {
        toast({ title: "Import Failed", description: "Could not read the file.", variant: "destructive"});
    }
    reader.readAsText(csvFileToImport);
    setIsImportConfirmOpen(false);
    setCsvFileToImport(null);
  };

  const triggerImportDialog = () => {
    document.getElementById('import-users-csv')?.click();
  };

  const handleSelectUser = (userId: string, isChecked: boolean | 'indeterminate') => {
    if (isChecked === true) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAllFilteredUsers = (isChecked: boolean | 'indeterminate') => {
    if (isChecked === true) {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const allFilteredUsersSelected = filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length;
  const someFilteredUsersSelected = selectedUserIds.length > 0 && selectedUserIds.length < filteredUsers.length;
  const selectAllUsersCheckedState = allFilteredUsersSelected ? true : (someFilteredUsersSelected ? "indeterminate" : false);

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.length === 0) {
        toast({ title: "No Users Selected", description: "Please select users to delete.", variant: "destructive" });
        return;
    }

    let usersToDelete = [...selectedUserIds];
    let operationCancelled = false;

    // Prevent deleting own account or the last admin
    if (authUser && usersToDelete.includes(authUser.id)) {
        toast({ title: "Action Blocked", description: "You cannot bulk delete your own account.", variant: "destructive" });
        usersToDelete = usersToDelete.filter(id => id !== authUser.id);
        if (usersToDelete.length === 0) operationCancelled = true;
    }
    
    const adminUsers = users.filter(u => u.role === 'admin');
    if (adminUsers.length === 1 && usersToDelete.includes(adminUsers[0].id)) {
        toast({ title: "Action Blocked", description: "Cannot delete the only admin user.", variant: "destructive" });
        usersToDelete = usersToDelete.filter(id => id !== adminUsers[0].id);
        if (usersToDelete.length === 0) operationCancelled = true;
    }
    
    if (operationCancelled || usersToDelete.length === 0) {
        setIsBulkDeleteConfirmOpen(false);
        setSelectedUserIds([]); // Clear selection if operation was fully blocked
        return;
    }

    const updatedUsers = users.filter(user => !usersToDelete.includes(user.id));
    try {
        await saveUsers(updatedUsers);
        setUsers(updatedUsers);
        toast({ title: "Bulk Delete Successful", description: `${usersToDelete.length} users have been deleted.` });
        setSelectedUserIds([]);
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete selected users.", variant: "destructive" });
    }
    setIsBulkDeleteConfirmOpen(false);
  };

  const handleBulkSetPassword = async () => {
    if (selectedUserIds.length === 0) {
        toast({ title: "No Users Selected", description: "Please select users to update their password.", variant: "destructive" });
        return;
    }
    if (bulkNewPassword.length < 6) {
        toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
        return;
    }

    const updatedUsers = users.map(user => {
        if (selectedUserIds.includes(user.id)) {
            return { ...user, password: bulkNewPassword };
        }
        return user;
    });

    try {
        await saveUsers(updatedUsers);
        setUsers(updatedUsers);
        // If authUser is in selectedUserIds, their context needs update
        if (authUser && selectedUserIds.includes(authUser.id)) {
            const updatedAuthUser = updatedUsers.find(u => u.id === authUser.id);
            if (updatedAuthUser) await updateUserInContext(updatedAuthUser);
        }
        toast({ title: "Bulk Password Update Successful", description: `Password updated for ${selectedUserIds.length} users.` });
        setSelectedUserIds([]);
        setIsBulkSetPasswordModalOpen(false);
        setBulkNewPassword("");
    } catch (error) {
        toast({ title: "Error", description: "Failed to update passwords for selected users.", variant: "destructive" });
    }
  };


  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <input type="file" id="import-users-csv" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">User Management</h1>
        <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
          {selectedUserIds.length > 0 && (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedUserIds.length}) <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setIsBulkDeleteConfirmOpen(true)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setBulkNewPassword(''); setIsBulkSetPasswordModalOpen(true); }}>
                  <KeyRound className="mr-2 h-4 w-4" /> Set Password for Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={triggerImportDialog} variant="outline"><Upload className="mr-2 h-4 w-4" /> Import CSV</Button>
          <Button onClick={handleExportCSV} variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button onClick={handleCreateNew}><PlusCircle className="mr-2 h-4 w-4" /> Create User</Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Registered Users</CardTitle>
            <div className="mt-2 relative">
                <Input 
                    type="search"
                    placeholder="Search users by name, username, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectAllUsersCheckedState}
                    onCheckedChange={handleSelectAllFilteredUsers}
                    aria-label="Select all filtered users"
                  />
                </TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredUsers.map((user) => (
                <TableRow key={user.id} data-state={selectedUserIds.includes(user.id) ? "selected" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                        aria-label={`Select user ${user.username}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email || "N/A"}</TableCell>
                    <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell>
                    <Badge variant={user.status === 'active' ? 'outline' : 'destructive'} className={user.status === 'active' ? 'border-green-500 text-green-600' : ''}>
                        {user.status}
                    </Badge>
                    </TableCell>
                    <TableCell>{availableTeams.find(t => t.id === user.teamId)?.name || "N/A"}</TableCell>
                    <TableCell>
                    <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} title="Edit User">
                        <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenPasswordModal(user)} title="Change Password">
                        <KeyRound className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:text-destructive" 
                                  title="Delete User" 
                                  disabled={(user.username === 'admin' && users.filter(u => u.role === 'admin').length <= 1) || (authUser?.id === user.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user "{user.username}".
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    </TableCell>
                </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No users found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit User" : "Create New User"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update user details." : "Enter details for the new user."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">Username</Label>
              <Input id="username" name="username" value={currentUser.username} onChange={handleInputChange} className="col-span-3" disabled={isEditing}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Full Name</Label>
              <Input id="name" name="name" value={currentUser.name} onChange={handleInputChange} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="email" className="text-right pt-2">Email</Label>
              <div className="col-span-3 space-y-1">
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={currentUser.email || ''} 
                  onChange={handleInputChange}
                />
                {currentUser.role === 'participant' && (
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={handleResetEmailToTeamDefault}
                    disabled={!currentUser.teamId}
                  >
                    Reset to Team Contact Email
                  </Button>
                )}
              </div>
            </div>
            {!isEditing && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password_initial" className="text-right">Password</Label>
                    <Input id="password_initial" name="password" type="password" placeholder="Min. 6 characters" className="col-span-3" 
                        onChange={(e) => setCurrentUser(prev => ({ ...prev, password: e.target.value }))}/>
                </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select value={currentUser.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participant</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={currentUser.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="teamId" className="text-right">Team</Label>
                <Select 
                    value={currentUser.teamId || "none"} 
                    onValueChange={handleTeamAssignmentChange}
                >
                    <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No Team / Unassigned</SelectItem>
                        {availableTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleSaveUser}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password for {currentUser.username}</DialogTitle>
            <DialogDescription>
              Enter a new password for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="col-span-3" 
                placeholder="Min. 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
             <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleChangePassword}>Set Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm CSV Import for Users</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">Importing this CSV file will <span className="font-bold text-destructive">replace all current user data</span>. This action cannot be undone.</p>
                
                <Alert variant="default" className="mb-3">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>CSV Format Instructions</AlertTitle>
                  <UiAlertDescription>
                    <p className="mb-1">Ensure your CSV file has the following columns in this exact order:</p>
                    <div className="overflow-x-auto whitespace-nowrap rounded bg-muted p-1 my-1">
                        <code className="text-xs">id,username,name,email,role,status,teamId</code>
                    </div>
                    <ul className="list-disc pl-5 mt-2 text-xs space-y-0.5">
                      <li><strong>Required columns:</strong> <code className="text-xs">username</code>, <code className="text-xs">name</code>, <code className="text-xs">role</code>, <code className="text-xs">status</code>.</li>
                      <li><code className="text-xs">id</code>: Optional. If omitted, a new ID will be auto-generated.</li>
                      <li><code className="text-xs">email</code>: Optional, but recommended for email campaigns.</li>
                      <li><code className="text-xs">role</code>: Must be either 'admin' or 'participant'.</li>
                      <li><code className="text-xs">status</code>: Must be either 'active' or 'locked'.</li>
                      <li><code className="text-xs">teamId</code>: Optional. If provided, ensure it's a valid ID from your teams data. If omitted, user will not be assigned to a team.</li>
                      <li><strong>Important:</strong> Passwords are not imported via CSV for security reasons. New or imported users will have a default password "imported_user_needs_reset" and will need their passwords set manually through the "Change Password" (key icon) option in the user list.</li>
                    </ul>
                     <p className="mt-2 text-xs">The application cannot delete the original CSV file from your computer after import.</p>
                  </UiAlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCsvFileToImport(null); setIsImportConfirmOpen(false); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={processImport}>Import and Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUserIds.length} selected user(s)? This action cannot be undone.
              { (authUser && selectedUserIds.includes(authUser.id)) || (users.filter(u => u.role === 'admin').length === 1 && selectedUserIds.includes(users.find(u => u.role === 'admin')!.id)) ? 
                <span className="block mt-2 text-destructive font-semibold">Warning: Critical accounts (your own or the last admin) will be skipped if selected.</span> 
                : null
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteUsers} className="bg-destructive hover:bg-destructive/90">
              Delete Selected Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* Bulk Set Password Dialog */}
      <Dialog open={isBulkSetPasswordModalOpen} onOpenChange={setIsBulkSetPasswordModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Password for Selected Users</DialogTitle>
            <DialogDescription>
              Enter a new password for the {selectedUserIds.length} selected user(s).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bulkNewPasswordInput" className="text-right">New Password</Label>
              <Input 
                id="bulkNewPasswordInput" 
                type="password" 
                value={bulkNewPassword} 
                onChange={(e) => setBulkNewPassword(e.target.value)} 
                className="col-span-3" 
                placeholder="Min. 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
             <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleBulkSetPassword}>Set Password for Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
