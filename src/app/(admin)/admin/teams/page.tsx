
"use client";

import { useState, useEffect, ChangeEvent, useCallback } from "react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit3, Trash2, Upload, Download, FileWarning, Search, Loader2, InfoIcon, ChevronDown, ImageIcon } from "lucide-react";
import type { Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
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
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTeams, saveTeams } from "@/actions/teamActions";
import { Alert, AlertTitle, AlertDescription as UiAlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEFAULT_BANNER_URL = "https://roboconoxon.org.uk/wp-content/uploads/2024/05/Robocon-Email-Banner-1200x300-1.png";

const defaultTeam: Team = {
  id: "", 
  name: "", 
  schoolName: "", 
  bannerImageUrl: DEFAULT_BANNER_URL, 
  contactPerson: "", 
  contactEmail: "", 
  roboconBrainId: "", 
  roboconBrainWifiPassword: "",
  notes: "", 
  dismissedResourceIds: [] 
};

// CSV Helper Functions
const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};

const teamsToCSV = (teamsData: Team[]): string => {
  const headers = ['id', 'name', 'schoolName', 'bannerImageUrl', 'contactPerson', 'contactEmail', 'roboconBrainId', 'roboconBrainWifiPassword', 'notes'];
  const headerRow = headers.map(escapeCsvField).join(',');
  const dataRows = teamsData.map(team => 
    headers.map(header => escapeCsvField(team[header as keyof Team])).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
};

const parseTeamsCSV = (csvText: string): Team[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error("CSV must contain headers and at least one data row.");

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').replace(/^\ufeff/, '')); // Remove BOM
  const teams: Team[] = [];

  const requiredHeaders = ['name', 'schoolName', 'roboconBrainId'];
  for (const reqHeader of requiredHeaders) {
    if (!headers.includes(reqHeader)) {
      throw new Error(`Missing required CSV header: ${reqHeader}`);
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const teamObject: Partial<Team> = {};
    headers.forEach((header, index) => {
      (teamObject as any)[header] = values[index] || ""; 
    });

    if (!teamObject.name || !teamObject.schoolName || !teamObject.roboconBrainId) {
        console.warn(`Skipping row ${i+1} due to missing required fields.`);
        continue;
    }
    
    teams.push({
        id: teamObject.id || `imported_team_${Date.now()}_${i}`,
        name: teamObject.name,
        schoolName: teamObject.schoolName,
        bannerImageUrl: teamObject.bannerImageUrl || DEFAULT_BANNER_URL,
        contactPerson: teamObject.contactPerson || "",
        contactEmail: teamObject.contactEmail || "",
        roboconBrainId: teamObject.roboconBrainId,
        roboconBrainWifiPassword: teamObject.roboconBrainWifiPassword || "",
        notes: teamObject.notes || "",
        dismissedResourceIds: [], // Ensure imported teams have this initialized
    });
  }
  return teams;
};


export default function TeamManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team>(defaultTeam);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [csvFileToImport, setCsvFileToImport] = useState<File | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isSetBannerModalOpen, setIsSetBannerModalOpen] = useState(false);
  const [newBannerUrlForBulk, setNewBannerUrlForBulk] = useState("");
  const [selectedBannerFileForBulk, setSelectedBannerFileForBulk] = useState<File | null>(null);


  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedTeams = await loadTeams();
      setTeams(loadedTeams.map(team => ({
        ...team,
        notes: team.notes ?? "", // Ensure notes is always a string
        dismissedResourceIds: team.dismissedResourceIds ?? [] // Ensure dismissedResourceIds is always an array
      })));
    } catch (error) {
      toast({ title: "Error", description: "Failed to load teams.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (team.roboconBrainId && team.roboconBrainId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateNew = () => {
    setIsEditing(false);
    setCurrentTeam(defaultTeam);
    setIsModalOpen(true);
  };

  const handleEdit = (team: Team) => {
    setIsEditing(true);
    setCurrentTeam({ // Ensure all fields are present when editing
      ...defaultTeam, // Start with defaults to ensure all fields exist
      ...team,         // Override with actual team data
      notes: team.notes ?? "",
      dismissedResourceIds: team.dismissedResourceIds ?? []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (teamId: string) => {
    const updatedTeams = teams.filter(team => team.id !== teamId);
    try {
      await saveTeams(updatedTeams);
      setTeams(updatedTeams);
      setSelectedTeamIds(prev => prev.filter(id => id !== teamId));
      toast({ title: "Team Deleted", description: "The team has been successfully deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete team.", variant: "destructive" });
    }
  };

  const handleSaveTeam = async () => {
    if (!currentTeam.name || !currentTeam.schoolName || !currentTeam.roboconBrainId) {
      toast({ title: "Error", description: "Team Name, School Name, and Robocon Brain ID are required.", variant: "destructive" });
      return;
    }

    let updatedTeams;
    let teamToSave: Team = { 
      ...currentTeam, 
      notes: currentTeam.notes ?? "",
      dismissedResourceIds: currentTeam.dismissedResourceIds ?? [] 
    };

    if (isEditing) {
      updatedTeams = teams.map(team => (team.id === teamToSave.id ? teamToSave : team));
    } else {
      teamToSave = { ...teamToSave, id: `team_${Date.now()}` }; 
      updatedTeams = [...teams, teamToSave];
    }
    
    try {
      await saveTeams(updatedTeams);
      setTeams(updatedTeams);
      toast({ title: isEditing ? "Team Updated" : "Team Created", description: `${teamToSave.name} has been ${isEditing ? 'updated' : 'created'}.` });
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save team.", variant: "destructive" });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentTeam(prev => ({ ...prev, [name]: value }));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
                 setCurrentTeam(prev => ({ ...prev, bannerImageUrl: event.target.result as string }));
                 toast({title: "Banner Preview Updated", description: "New banner image is previewed. Save to apply."});
            }
        };
        reader.readAsDataURL(e.target.files[0]);
    } else {
        // This case is for when the input is a text input (URL)
        setCurrentTeam(prev => ({ ...prev, bannerImageUrl: e.target.value }));
    }
  };


  const handleDeleteAllTeams = async () => {
    try {
      await saveTeams([]);
      setTeams([]);
      setSelectedTeamIds([]);
      toast({ title: "All Teams Deleted", description: "All teams have been removed.", variant: "destructive"});
    } catch (error) {
       toast({ title: "Error", description: "Failed to delete all teams.", variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    const csvData = teamsToCSV(teams);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'teams_export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: "Teams data exported to CSV." });
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
        const importedTeams = parseTeamsCSV(text);
        await saveTeams(importedTeams); 
        setTeams(importedTeams.map(team => ({ // Ensure consistency after import
            ...team,
            notes: team.notes ?? "",
            dismissedResourceIds: team.dismissedResourceIds ?? []
        }))); 
        setSelectedTeamIds([]);
        toast({ title: "Import Successful", description: `${importedTeams.length} teams imported and replaced existing data.` });
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
    document.getElementById('import-teams-csv')?.click();
  };

  const handleSelectTeam = (teamId: string, isChecked: boolean | 'indeterminate') => {
    if (isChecked === true) {
      setSelectedTeamIds(prev => [...prev, teamId]);
    } else {
      setSelectedTeamIds(prev => prev.filter(id => id !== teamId));
    }
  };

  const handleSelectAllFilteredTeams = (isChecked: boolean | 'indeterminate') => {
    if (isChecked === true) {
      setSelectedTeamIds(filteredTeams.map(t => t.id));
    } else {
      setSelectedTeamIds([]);
    }
  };

  const allFilteredSelected = filteredTeams.length > 0 && selectedTeamIds.length === filteredTeams.length;
  const someFilteredSelected = selectedTeamIds.length > 0 && selectedTeamIds.length < filteredTeams.length;
  const selectAllCheckedState = allFilteredSelected ? true : (someFilteredSelected ? "indeterminate" : false);

  const handleBulkDeleteTeams = async () => {
    if (selectedTeamIds.length === 0) {
        toast({ title: "No Teams Selected", description: "Please select teams to delete.", variant: "destructive" });
        return;
    }
    const updatedTeams = teams.filter(team => !selectedTeamIds.includes(team.id));
    try {
        await saveTeams(updatedTeams);
        setTeams(updatedTeams);
        toast({ title: "Bulk Delete Successful", description: `${selectedTeamIds.length} teams have been deleted.` });
        setSelectedTeamIds([]);
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete selected teams.", variant: "destructive" });
    }
    setIsBulkDeleteConfirmOpen(false);
  };

  const handleBulkSetBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedBannerFileForBulk(e.target.files[0]);
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
                setNewBannerUrlForBulk(event.target.result as string); // Preview / use as data URI
            }
        };
        reader.readAsDataURL(e.target.files[0]);
    } else {
        setSelectedBannerFileForBulk(null);
    }
  };
  
  const handleBulkSetBanner = async () => {
    if (selectedTeamIds.length === 0) {
        toast({ title: "No Teams Selected", description: "Please select teams to update.", variant: "destructive" });
        return;
    }
    if (!newBannerUrlForBulk.trim() && !selectedBannerFileForBulk) {
        toast({ title: "No Banner Provided", description: "Please provide a banner URL or upload an image.", variant: "destructive" });
        return;
    }

    // If a file was selected, newBannerUrlForBulk already holds its data URI
    // If only URL was typed, newBannerUrlForBulk holds that URL
    const bannerToApply = newBannerUrlForBulk;

    const updatedTeams = teams.map(team => {
        if (selectedTeamIds.includes(team.id)) {
            return { ...team, bannerImageUrl: bannerToApply };
        }
        return team;
    });

    try {
        await saveTeams(updatedTeams);
        setTeams(updatedTeams);
        toast({ title: "Bulk Banner Update Successful", description: `Banner updated for ${selectedTeamIds.length} teams.` });
        setSelectedTeamIds([]);
        setIsSetBannerModalOpen(false);
        setNewBannerUrlForBulk("");
        setSelectedBannerFileForBulk(null);
    } catch (error) {
        toast({ title: "Error", description: "Failed to update banners for selected teams.", variant: "destructive" });
    }
  };


  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <input type="file" id="import-teams-csv" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">Team Management</h1>
        <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
          {selectedTeamIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedTeamIds.length}) <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setIsBulkDeleteConfirmOpen(true)} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setNewBannerUrlForBulk(DEFAULT_BANNER_URL); setSelectedBannerFileForBulk(null); setIsSetBannerModalOpen(true); }}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Set Banner for Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={triggerImportDialog} variant="outline"><Upload className="mr-2 h-4 w-4" /> Import CSV</Button>
          <Button onClick={handleExportCSV} variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button onClick={handleCreateNew}><PlusCircle className="mr-2 h-4 w-4" /> Create Team</Button>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Active Teams</CardTitle>
            <div className="mt-2 relative">
                <Input 
                    type="search"
                    placeholder="Search teams..."
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
                    checked={selectAllCheckedState}
                    onCheckedChange={handleSelectAllFilteredTeams}
                    aria-label="Select all filtered teams"
                  />
                </TableHead>
                <TableHead>Team Name</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Brain ID</TableHead>
                <TableHead className="hidden md:table-cell">Brain WiFi Pass</TableHead>
                <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredTeams.map((team) => (
                <TableRow key={team.id} data-state={selectedTeamIds.includes(team.id) ? "selected" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTeamIds.includes(team.id)}
                        onCheckedChange={(checked) => handleSelectTeam(team.id, checked)}
                        aria-label={`Select team ${team.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.schoolName}</TableCell>
                    <TableCell>{team.roboconBrainId}</TableCell>
                    <TableCell className="hidden md:table-cell">{team.roboconBrainWifiPassword || "N/A"}</TableCell>
                    <TableCell>
                    <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(team)}>
                        <Edit3 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the team "{team.name}".
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(team.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    </TableCell>
                </TableRow>
                ))}
                 {filteredTeams.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No teams found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
      </Card>

      <div className="mt-6">
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive"><FileWarning className="mr-2 h-4 w-4" /> Delete All Teams</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion of All Teams</AlertDialogTitle>
                <AlertDialogDescription>
                    This action is irreversible and will delete all team data. Are you absolutely sure?
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllTeams} className="bg-destructive hover:bg-destructive/90">
                    Yes, Delete All
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Team" : "Create New Team"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the details for this team." : "Enter the details for the new team."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Team Name</Label>
              <Input id="name" name="name" value={currentTeam.name} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="schoolName" className="text-right">School Name</Label>
              <Input id="schoolName" name="schoolName" value={currentTeam.schoolName} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactPerson" className="text-right">Contact Person</Label>
              <Input id="contactPerson" name="contactPerson" value={currentTeam.contactPerson} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactEmail" className="text-right">Contact Email</Label>
              <Input id="contactEmail" name="contactEmail" type="email" value={currentTeam.contactEmail} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roboconBrainId" className="text-right">Brain ID</Label>
              <Input id="roboconBrainId" name="roboconBrainId" value={currentTeam.roboconBrainId} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="roboconBrainWifiPassword" className="text-right">Brain WiFi Pass</Label>
              <Input id="roboconBrainWifiPassword" name="roboconBrainWifiPassword" value={currentTeam.roboconBrainWifiPassword || ""} onChange={handleInputChange} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bannerImageUrl" className="text-right">Banner Image</Label>
              <div className="col-span-3 space-y-2">
                <Input 
                    id="bannerImageFile" 
                    name="bannerImageFile" 
                    type="file" 
                    accept="image/*"
                    onChange={handleBannerChange} 
                    className="col-span-3" 
                />
                 <Input 
                    id="bannerImageUrl" 
                    name="bannerImageUrl" 
                    type="text"
                    value={currentTeam.bannerImageUrl && currentTeam.bannerImageUrl.startsWith('data:') ? '(Local Preview)' : (currentTeam.bannerImageUrl || '')}
                    onChange={handleBannerChange} 
                    className="col-span-3 mt-1"
                    placeholder="Or enter image URL"
                />
                {currentTeam.bannerImageUrl && (
                    <Image src={currentTeam.bannerImageUrl} alt="Banner Preview" width={200} height={50} className="rounded-md border object-cover" data-ai-hint="team banner preview"/>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <textarea id="notes" name="notes" value={currentTeam.notes || ""} onChange={handleInputChange} className="col-span-3 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSaveTeam}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm CSV Import for Teams</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">Importing this CSV file will <span className="font-bold text-destructive">replace all current team data</span>. This action cannot be undone.</p>
                
                <Alert variant="default" className="mb-3">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>CSV Format Instructions</AlertTitle>
                  <UiAlertDescription>
                    <p className="mb-1">Ensure your CSV file has the following columns in this exact order:</p>
                    <div className="overflow-x-auto whitespace-nowrap rounded bg-muted p-1 my-1">
                        <code className="text-xs">id,name,schoolName,bannerImageUrl,contactPerson,contactEmail,roboconBrainId,roboconBrainWifiPassword,notes</code>
                    </div>
                    <ul className="list-disc pl-5 mt-2 text-xs space-y-0.5">
                      <li><strong>Required columns:</strong> <code className="text-xs">name</code>, <code className="text-xs">schoolName</code>, <code className="text-xs">roboconBrainId</code>.</li>
                      <li><code className="text-xs">id</code>: Optional. If omitted, a new ID will be auto-generated.</li>
                      <li><code className="text-xs">bannerImageUrl</code>: Optional. Defaults to a standard banner if empty.</li>
                      <li><code className="text-xs">contactPerson</code>, <code className="text-xs">contactEmail</code>, <code className="text-xs">roboconBrainWifiPassword</code>, <code className="text-xs">notes</code>: All optional.</li>
                    </ul>
                  </UiAlertDescription>
                </Alert>
                
                <p className="mt-3 text-sm text-muted-foreground">
                  The application cannot delete the original CSV file from your computer after import.
                  Please ensure you are ready to proceed.
                </p>
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
              Are you sure you want to delete {selectedTeamIds.length} selected team(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeleteTeams} className="bg-destructive hover:bg-destructive/90">
              Delete Selected Teams
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Set Banner Dialog */}
      <Dialog open={isSetBannerModalOpen} onOpenChange={setIsSetBannerModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Set Banner for Selected Teams</DialogTitle>
            <DialogDescription>
              Set a new banner image for the {selectedTeamIds.length} selected team(s). You can upload an image or provide a URL.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkBannerImageFile">Upload Banner Image (Optional)</Label>
              <Input 
                id="bulkBannerImageFile" 
                name="bulkBannerImageFile" 
                type="file" 
                accept="image/*"
                onChange={handleBulkSetBannerFileChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkBannerImageUrl">Or Enter Banner Image URL</Label>
              <Input 
                id="bulkBannerImageUrl" 
                name="bulkBannerImageUrl" 
                type="text"
                value={newBannerUrlForBulk}
                onChange={(e) => { setNewBannerUrlForBulk(e.target.value); setSelectedBannerFileForBulk(null);}}
                placeholder="https://example.com/banner.png"
              />
            </div>
            {newBannerUrlForBulk && (
                <div className="mt-2">
                    <Label>Banner Preview</Label>
                    <Image src={newBannerUrlForBulk} alt="Banner Preview" width={300} height={75} className="rounded-md border object-cover mt-1" data-ai-hint="team banner preview"/>
                </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleBulkSetBanner}>Apply Banner to Selected</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
    
