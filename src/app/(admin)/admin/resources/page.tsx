
"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { PlusCircle, Edit3, Trash2, Search, X, Loader2, Link as LinkIcon } from "lucide-react";
import type { Resource, Team } from "@/lib/types";
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { loadResources, saveResources } from "@/actions/resourceActions";
import { loadTeams } from "@/actions/teamActions"; // To populate team selection dropdown

const defaultResource: Resource = { 
  id: "", 
  title: "", 
  content: "", 
  linkUrl: "", 
  assignedTeamIds: "none", 
  author: "Admin", 
  tags: [] 
};

export default function ResourceManagementPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [teamsForSelection, setTeamsForSelection] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentResource, setCurrentResource] = useState<Resource>(defaultResource);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTagInput, setCurrentTagInput] = useState("");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedResources, loadedTeams] = await Promise.all([
        loadResources(),
        loadTeams()
      ]);
      setResources(loadedResources);
      setTeamsForSelection(loadedTeams);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateNew = () => {
    setIsEditing(false);
    setCurrentResource(defaultResource);
    setCurrentTagInput("");
    setIsModalOpen(true);
  };

  const handleEdit = (resource: Resource) => {
    setIsEditing(true);
    setCurrentResource(resource);
    setCurrentTagInput("");
    setIsModalOpen(true);
  };

  const handleDelete = async (resourceId: string) => {
    const updatedResources = resources.filter(res => res.id !== resourceId);
    try {
      await saveResources(updatedResources);
      setResources(updatedResources);
      toast({ title: "Resource Deleted", description: "The resource has been successfully deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete resource.", variant: "destructive" });
    }
  };

  const handleSaveResource = async () => {
    if (!currentResource.title || !currentResource.content || !currentResource.author) {
      toast({ title: "Error", description: "Title, Content, and Author are required.", variant: "destructive" });
      return;
    }
    if (currentResource.linkUrl && !currentResource.linkUrl.startsWith('http://') && !currentResource.linkUrl.startsWith('https://')) {
        toast({ title: "Invalid Link", description: "Resource link must start with http:// or https://", variant: "destructive" });
        return;
    }


    let updatedResources;
    let resourceToSave = { ...currentResource };

    if (isEditing) {
      updatedResources = resources.map(res => (res.id === resourceToSave.id ? resourceToSave : res));
    } else {
      resourceToSave = { ...currentResource, id: `res_${Date.now()}` };
      updatedResources = [...resources, resourceToSave];
    }
    
    try {
      await saveResources(updatedResources);
      setResources(updatedResources);
      toast({ title: isEditing ? "Resource Updated" : "Resource Created", description: `${resourceToSave.title} has been ${isEditing ? 'updated' : 'created'}.` });
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save resource.", variant: "destructive" });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentResource(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignedTeamChange = (value: string) => {
    if (value === "all" || value === "none") {
      setCurrentResource(prev => ({ ...prev, assignedTeamIds: value as "all" | "none" }));
    } else {
      setCurrentResource(prev => ({ ...prev, assignedTeamIds: [value] }));
    }
  };
  
  const handleAddTag = () => {
    if (currentTagInput && !currentResource.tags.includes(currentTagInput.trim())) {
      setCurrentResource(prev => ({ ...prev, tags: [...prev.tags, currentTagInput.trim()] }));
      setCurrentTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCurrentResource(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };
  
  const getAssignedToText = (assignedTeamIds: string[] | "all" | "none"): string => {
    if (assignedTeamIds === "all") return "All Teams";
    if (assignedTeamIds === "none") return "None";
    if (Array.isArray(assignedTeamIds)) {
      if (assignedTeamIds.length === 0) return "None";
      if (assignedTeamIds.length <= 2) {
        return assignedTeamIds.map(id => teamsForSelection.find(t => t.id === id)?.name || id).join(', ');
      }
      return `${assignedTeamIds.length} teams`;
    }
    return "Unknown";
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold font-headline">Resource Management</h1>
        <Button onClick={handleCreateNew}><PlusCircle className="mr-2 h-4 w-4" /> Create Resource</Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Available Resources</CardTitle>
            <div className="mt-2 relative">
                <Input 
                    type="search"
                    placeholder="Search resources by title, author, or tag..."
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
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="hidden md:table-cell">Tags</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                    <TableCell className="font-medium">{resource.title}</TableCell>
                    <TableCell>{resource.author}</TableCell>
                    <TableCell>{getAssignedToText(resource.assignedTeamIds)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                        {resource.tags.slice(0,3).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        {resource.tags.length > 3 && <Badge variant="outline">+{resource.tags.length - 3}</Badge>}
                        </div>
                    </TableCell>
                    <TableCell>
                      {resource.linkUrl ? (
                        <a href={resource.linkUrl} target="_blank" rel="noopener noreferrer" title={resource.linkUrl}>
                          <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                    <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(resource)}>
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
                                  This action cannot be undone. This will permanently delete the resource "{resource.title}".
                              </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(resource.id)} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                              </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    </TableCell>
                </TableRow>
                ))}
                 {filteredResources.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No resources found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Resource" : "Create New Resource"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update resource details." : "Enter details for the new resource."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <Input id="title" name="title" value={currentResource.title} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right pt-2">Content</Label>
              <Textarea id="content" name="content" value={currentResource.content} onChange={handleInputChange} className="col-span-3 min-h-[120px]" placeholder="Markdown supported (basic)"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="linkUrl" className="text-right">Resource Link (Optional)</Label>
              <Input id="linkUrl" name="linkUrl" value={currentResource.linkUrl || ""} onChange={handleInputChange} className="col-span-3" placeholder="https://example.com/document.pdf" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="author" className="text-right">Author</Label>
              <Input id="author" name="author" value={currentResource.author} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignedTeamIds" className="text-right">Assigned To</Label>
              <Select 
                value={Array.isArray(currentResource.assignedTeamIds) ? (currentResource.assignedTeamIds[0] || "none") : currentResource.assignedTeamIds} 
                onValueChange={handleAssignedTeamChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Specific Teams</SelectLabel>
                    {teamsForSelection.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="tags" className="text-right pt-2">Tags</Label>
              <div className="col-span-3 space-y-2">
                <div className="flex gap-2">
                  <Input 
                    id="tags" 
                    value={currentTagInput} 
                    onChange={(e) => setCurrentTagInput(e.target.value)} 
                    placeholder="Add a tag"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag();}}}
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentResource.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveTag(tag)}>
                        <X size={12}/>
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleSaveResource}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
