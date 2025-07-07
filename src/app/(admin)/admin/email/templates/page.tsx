
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash2, Loader2, Save } from "lucide-react";
import type { EmailTemplate } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
import { loadEmailTemplates, saveEmailTemplates } from "@/actions/emailTemplateActions";
import { format } from "date-fns";

const defaultTemplate: Omit<EmailTemplate, 'id' | 'createdAt'> = {
  name: "",
  subject: "",
  htmlBody: "",
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(defaultTemplate);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedTemplates = await loadEmailTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load email templates.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreateNew = () => {
    setEditingTemplateId(null);
    setCurrentTemplate(defaultTemplate);
    setIsModalOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplateId(template.id);
    setCurrentTemplate({
      name: template.name,
      subject: template.subject,
      htmlBody: template.htmlBody,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    try {
      await saveEmailTemplates(updatedTemplates);
      setTemplates(updatedTemplates);
      toast({ title: "Template Deleted", description: "The email template has been deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!currentTemplate.name.trim() || !currentTemplate.subject.trim() || !currentTemplate.htmlBody.trim()) {
      toast({ title: "Error", description: "Name, Subject, and HTML Body are required.", variant: "destructive" });
      return;
    }

    let updatedTemplates;

    if (editingTemplateId) {
      updatedTemplates = templates.map(t =>
        t.id === editingTemplateId ? { ...t, ...currentTemplate } : t
      );
    } else {
      const newTemplate: EmailTemplate = {
        ...currentTemplate,
        id: `template_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updatedTemplates = [...templates, newTemplate];
    }

    try {
      await saveEmailTemplates(updatedTemplates);
      setTemplates(updatedTemplates);
      toast({ title: `Template ${editingTemplateId ? 'Updated' : 'Created'}`, description: "The email template has been saved." });
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>Create and manage reusable email templates for campaigns and automated notifications.</CardDescription>
        </div>
        <Button onClick={handleCreateNew}><PlusCircle className="mr-2 h-4 w-4" /> Create Template</Button>
      </CardHeader>
      <CardContent>
        {templates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-sm truncate">{template.subject}</TableCell>
                  <TableCell>{format(new Date(template.createdAt), 'PPP')}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
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
                              This action cannot be undone. This will permanently delete the template "{template.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(template.id)} className="bg-destructive hover:bg-destructive/90">
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
          <div className="text-center py-4 text-muted-foreground">No email templates created yet.</div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? "Edit Template" : "Create New Template"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={currentTemplate.name}
                onChange={(e) => setCurrentTemplate(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Welcome Email, Progress Approved"
              />
            </div>
            <div>
              <Label htmlFor="templateSubject">Subject</Label>
              <Input
                id="templateSubject"
                value={currentTemplate.subject}
                onChange={(e) => setCurrentTemplate(p => ({ ...p, subject: e.target.value }))}
                placeholder="Email Subject Line"
              />
            </div>
            <div>
              <Label htmlFor="templateHtmlBody">HTML Body</Label>
              <Textarea
                id="templateHtmlBody"
                value={currentTemplate.htmlBody}
                onChange={(e) => setCurrentTemplate(p => ({ ...p, htmlBody: e.target.value }))}
                placeholder="Paste your email's HTML code here. Use placeholders like {{name}} or {{teamName}}."
                className="min-h-[300px] font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
