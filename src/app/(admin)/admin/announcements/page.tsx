
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertTriangle, CheckCircle, LucideIcon, Edit, Save, XCircle, PlusCircle, Trash2, Loader2, MessageSquareOff } from "lucide-react";
import type { Announcement, AnnouncementAlertType, AnnouncementDisplayLocation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { loadAnnouncements, saveAnnouncements } from "@/actions/announcementActions";
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
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
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

const getAlertIcon = (type: AnnouncementAlertType): LucideIcon => {
  switch (type) {
    case "emergency": return AlertTriangle;
    case "maintenance": return Info;
    case "info": return CheckCircle;
    default: return Info;
  }
};

const defaultAnnouncement: Omit<Announcement, 'id' | 'activeSince'> = {
  content: "",
  isActive: false,
  displayLocation: "teams", 
  alertType: "info",
  isDismissible: false,
};


export default function AnnouncementManagementPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | Omit<Announcement, 'id' | 'activeSince'>>(defaultAnnouncement);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const displayLocationsOptions: { value: AnnouncementDisplayLocation, label: string }[] = [
    { value: "login", label: "Login Page Only" },
    { value: "teams", label: "Teams Page Only" },
    { value: "both", label: "Login & Teams Pages" },
  ];


  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedAnnouncements = await loadAnnouncements();
      setAnnouncements(loadedAnnouncements.map(ann => ({...ann, isDismissible: ann.isDismissible ?? false })));
    } catch (error) {
      toast({ title: "Error", description: "Failed to load announcements.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);
  
  const handleCreateNew = () => {
    setIsEditing(false);
    setCurrentAnnouncement(defaultAnnouncement);
    setIsModalOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setIsEditing(true);
    setCurrentAnnouncement({...announcement, isDismissible: announcement.isDismissible ?? false});
    setIsModalOpen(true);
  };

  const handleDelete = async (announcementId: string) => {
    const updatedAnnouncements = announcements.filter(ann => ann.id !== announcementId);
    try {
      await saveAnnouncements(updatedAnnouncements);
      setAnnouncements(updatedAnnouncements);
      toast({ title: "Announcement Deleted", description: "The announcement has been deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete announcement.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    const announcementToSave = currentAnnouncement as Announcement; 
    if (!announcementToSave.content.trim()) {
      toast({ title: "Error", description: "Announcement content cannot be empty.", variant: "destructive" });
      return;
    }
    if (!announcementToSave.displayLocation) {
        toast({ title: "Error", description: "Please select a display location.", variant: "destructive" });
        return;
    }

    let updatedAnnouncements;
    let finalAnnouncement: Announcement;

    if (isEditing && 'id' in announcementToSave) {
      finalAnnouncement = {
        ...announcementToSave,
        activeSince: announcementToSave.isActive ? (announcementToSave.activeSince || new Date().toISOString()) : undefined,
        isDismissible: announcementToSave.isDismissible ?? false,
      };
      updatedAnnouncements = announcements.map(ann => ann.id === finalAnnouncement.id ? finalAnnouncement : ann);
    } else {
      finalAnnouncement = {
        ...(announcementToSave as Omit<Announcement, 'id' | 'activeSince'>), 
        id: `ann_${Date.now()}`,
        activeSince: announcementToSave.isActive ? new Date().toISOString() : undefined,
        isDismissible: announcementToSave.isDismissible ?? false,
      };
      updatedAnnouncements = [...announcements, finalAnnouncement];
    }

    try {
      await saveAnnouncements(updatedAnnouncements);
      setAnnouncements(updatedAnnouncements);
      toast({ title: `Announcement ${isEditing ? 'Updated' : 'Created'}`, description: "The announcement has been saved." });
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save announcement.", variant: "destructive" });
    }
  };
  
  const handleDisplayLocationChange = (value: AnnouncementDisplayLocation) => {
    setCurrentAnnouncement(prev => ({...prev, displayLocation: value }));
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const getDisplayLocationLabel = (value: AnnouncementDisplayLocation): string => {
    const option = displayLocationsOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline">Site Announcements</h1>
        <Button onClick={handleCreateNew}><PlusCircle className="mr-2 h-4 w-4" /> Create Announcement</Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Manage Announcements</CardTitle>
          <CardDescription>
            Create, edit, or delete site-wide announcements. Active announcements are shown to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content (Preview)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Display On</TableHead>
                  <TableHead>Dismissible</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((ann) => (
                  <TableRow key={ann.id}>
                    <TableCell className="max-w-sm truncate">
                      <span dangerouslySetInnerHTML={{__html: ann.content.length > 100 ? ann.content.substring(0,100).replace(/\n/g, "<br />") + "..." : ann.content.replace(/\n/g, "<br />") }}/>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ann.isActive ? "default" : "outline"} className={ann.isActive ? "bg-accent text-accent-foreground" : ""}>
                        {ann.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="capitalize">{ann.alertType}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                        {getDisplayLocationLabel(ann.displayLocation)}
                    </TableCell>
                     <TableCell>
                        {ann.isDismissible ? <CheckCircle className="h-5 w-5 text-green-500" /> : <MessageSquareOff className="h-5 w-5 text-muted-foreground" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ann)}>
                          <Edit className="h-4 w-4" />
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
                                  This action cannot be undone. This will permanently delete this announcement.
                              </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(ann.id)} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                              </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No announcements created yet.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="content">Announcement Content (Markdown basic support)</Label>
              <Textarea
                id="content"
                value={currentAnnouncement.content}
                onChange={(e) => setCurrentAnnouncement(prev => ({...prev, content: e.target.value}))}
                rows={6}
                placeholder="Enter announcement text here..."
                className="min-h-[150px]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={currentAnnouncement.isActive}
                onCheckedChange={(checked) => setCurrentAnnouncement(prev => ({...prev, isActive: checked}))}
              />
              <Label htmlFor="isActive">Set as Active Announcement</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isDismissible"
                checked={currentAnnouncement.isDismissible ?? false}
                onCheckedChange={(checked) => setCurrentAnnouncement(prev => ({...prev, isDismissible: checked}))}
              />
              <Label htmlFor="isDismissible">Allow users to dismiss this announcement</Label>
            </div>

            <div>
              <Label>Display On</Label>
              <RadioGroup 
                value={currentAnnouncement.displayLocation} 
                onValueChange={(value) => handleDisplayLocationChange(value as AnnouncementDisplayLocation)}
                className="mt-1 space-y-2"
              >
                {displayLocationsOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`display-${option.value}`} />
                    <Label htmlFor={`display-${option.value}`} className="font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="alertType">Alert Type</Label>
              <Select 
                value={currentAnnouncement.alertType} 
                onValueChange={(value) => setCurrentAnnouncement(prev => ({...prev, alertType: value as AnnouncementAlertType}))}
              >
                <SelectTrigger id="alertType" className="w-full">
                  <SelectValue placeholder="Select alert type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Blue/Default)</SelectItem>
                  <SelectItem value="maintenance">Maintenance (Yellow-ish/Muted)</SelectItem>
                  <SelectItem value="emergency">Emergency (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
             {isEditing && 'id' in currentAnnouncement && currentAnnouncement.activeSince && (
                <p className="text-xs text-muted-foreground">
                    Active since: {new Date(currentAnnouncement.activeSince).toLocaleString()}
                </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} variant="default"><Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Create Announcement"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
