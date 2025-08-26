import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  Plus, 
  Edit2, 
  Trash2, 
  FileAudio,
  BookOpen,
  ListOrdered,
  ChevronRight,
  Loader2,
  Check,
  X,
  Music,
  FolderSync,
  RefreshCw,
  Download,
  Clock,
  AlertCircle,
  Pencil,
  Eye,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Course, Assignment, Chapter } from "@shared/schema";

// Form schemas
const courseSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Course name is required"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const assignmentSchema = z.object({
  courseId: z.string().min(1, "Course is required"),
  title: z.string().min(1, "Assignment title is required"),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
});

const chapterSchema = z.object({
  assignmentId: z.string().min(1, "Assignment is required"),
  title: z.string().min(1, "Chapter title is required"),
  orderIndex: z.number().min(0),
  duration: z.number().optional(),
});

interface CourseWithAssignments extends Course {
  assignments?: AssignmentWithChapters[];
}

interface AssignmentWithChapters extends Assignment {
  chapters?: Chapter[];
}

export function UnifiedContentManager() {
  const { toast } = useToast();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [dialogType, setDialogType] = useState<"course" | "assignment" | "chapter" | null>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedJsonFile, setSelectedJsonFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showJsonContent, setShowJsonContent] = useState(false);
  const [jsonContent, setJsonContent] = useState<any>(null);
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [showJsonUpload, setShowJsonUpload] = useState(false);
  const [selectedCourseForAssignment, setSelectedCourseForAssignment] = useState<string>("");
  const [selectedAssignmentForChapter, setSelectedAssignmentForChapter] = useState<string>("");

  // Queries
  const { data: courses = [], isLoading: coursesLoading, refetch: refetchCourses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: syncStatus } = useQuery({
    queryKey: ["/api/admin/sync-status"],
  });

  // Form instances
  const courseForm = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  const assignmentForm = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      courseId: "",
      title: "",
      description: "",
      orderIndex: 0,
    },
  });

  const chapterForm = useForm({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      assignmentId: "",
      title: "",
      orderIndex: 0,
      duration: 0,
    },
  });

  // Load all assignments
  const { data: allAssignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/admin/all-assignments"],
  });

  // Load all chapters
  const { data: allChapters = [], refetch: refetchChapters } = useQuery<Chapter[]>({
    queryKey: ["/api/admin/all-chapters"],
    staleTime: 0, // Force fresh data
    gcTime: 0, // Prevent caching
  });

  // Organize data hierarchically
  const coursesWithData = courses.map(course => {
    const courseAssignments = allAssignments
      .filter(a => a.courseId === course.id)
      .map(assignment => {
        const assignmentChapters = allChapters.filter(c => c.assignmentId === assignment.id);
        // Debug logging
        if (assignment.id === '4f53a908-4427-44fa-a77e-156b5fc5b427') {
          console.log('Assignment chapters for "The Insurance Solution":', assignmentChapters);
          console.log('All chapters:', allChapters);
        }
        return { ...assignment, chapters: assignmentChapters };
      });
    return { ...course, assignments: courseAssignments };
  });

  // Course mutations
  const createCourseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof courseSchema>) => {
      return await apiRequest("POST", "/api/admin/courses", data);
    },
    onSuccess: () => {
      toast({ title: "Course created", description: "The course has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      courseForm.reset();
      setDialogType(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Course> }) => {
      return await apiRequest("PUT", `/api/admin/courses/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Course updated", description: "The course has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setEditingItem(null);
      setDialogType(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/courses/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Course deleted", description: "The course has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setDeleteItem(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Assignment mutations
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentSchema>) => {
      return await apiRequest("POST", "/api/admin/assignments", data);
    },
    onSuccess: (_, variables) => {
      toast({ title: "Assignment created", description: "The assignment has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-assignments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${variables.courseId}/assignments`] });
      assignmentForm.reset();
      setDialogType(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Assignment> }) => {
      return await apiRequest("PUT", `/api/admin/assignments/${id}`, data);
    },
    onSuccess: (_, variables) => {
      toast({ title: "Assignment updated", description: "The assignment has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setEditingItem(null);
      setDialogType(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/assignments/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Assignment deleted", description: "The assignment has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setDeleteItem(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Chapter mutations
  const createChapterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof chapterSchema> & { audioUrl: string }) => {
      return await apiRequest("POST", "/api/admin/chapters", data);
    },
    onSuccess: (_, variables) => {
      toast({ title: "Chapter created", description: "The chapter has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-chapters"] });
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/${variables.assignmentId}/chapters`] });
      chapterForm.reset();
      setSelectedFile(null);
      setDialogType(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Chapter> }) => {
      return await apiRequest("PUT", `/api/admin/chapters/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Chapter updated", description: "The chapter has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-chapters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setEditingItem(null);
      setDialogType(null);
      setSelectedJsonFile(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/chapters/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Chapter deleted", description: "The chapter has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-chapters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setDeleteItem(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/sync");
    },
    onSuccess: () => {
      toast({ title: "Content Sync Started", description: "Syncing course audio from content repository API" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-chapters"] });
    },
    onError: (error) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    },
  });

  // File upload handler
  const handleFileUpload = async (chapterData: z.infer<typeof chapterSchema>) => {
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select an audio file to upload.", variant: "destructive" });
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload the file first, then create the chapter with the audio URL
      const formData = new FormData();
      formData.append("audio", selectedFile);

      // Upload to a temporary endpoint that doesn't require chapter ID
      const uploadResponse = await fetch("/api/admin/upload-temp-audio", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Upload error:", errorText);
        throw new Error(`Failed to upload audio file: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      setUploadProgress(100);

      // Now create the chapter with the actual audio URL
      const newChapter = await apiRequest("POST", "/api/admin/chapters", {
        ...chapterData,
        audioUrl: uploadResult.audioUrl,
      }) as any;

      setIsUploading(false);
      return { chapterId: newChapter.id, audioUrl: uploadResult.audioUrl };
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: "Failed to upload audio file. Please try again.", variant: "destructive" });
      throw error;
    }
  };

  // Form submit handlers
  const handleCourseSubmit = (data: z.infer<typeof courseSchema>) => {
    if (editingItem) {
      updateCourseMutation.mutate({ id: editingItem.id, data });
    } else {
      createCourseMutation.mutate(data);
    }
  };

  const handleAssignmentSubmit = (data: z.infer<typeof assignmentSchema>) => {
    if (editingItem) {
      updateAssignmentMutation.mutate({ id: editingItem.id, data });
    } else {
      createAssignmentMutation.mutate(data);
    }
  };

  const handleChapterSubmit = async (data: z.infer<typeof chapterSchema>) => {
    if (editingItem) {
      // When editing, handle JSON file upload if present
      if (selectedJsonFile) {
        try {
          // Upload and process the JSON file
          const jsonFormData = new FormData();
          jsonFormData.append("readalong", selectedJsonFile);
          
          const jsonResponse = await fetch("/api/admin/upload-readalong-json", {
            method: "POST",
            body: jsonFormData,
            credentials: "include",
          });

          if (jsonResponse.ok) {
            const jsonResult = await jsonResponse.json();
            
            // Update the chapter with read-along data
            await apiRequest("POST", `/api/admin/read-along/${editingItem.id}`, jsonResult.data);
            
            toast({
              title: "Read-along data added",
              description: "The read-along JSON file has been processed successfully.",
            });
          } else {
            toast({
              title: "Read-along upload warning",
              description: "The chapter was updated but read-along data could not be added.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error uploading read-along JSON:", error);
          toast({
            title: "Read-along upload failed",
            description: "Failed to process the read-along file.",
            variant: "destructive",
          });
        }
      }
      
      // Update the chapter basic data
      updateChapterMutation.mutate({ id: editingItem.id, data });
      setSelectedJsonFile(null);
    } else {
      if (!selectedFile) {
        toast({ title: "No audio file", description: "Please select an audio file for the chapter.", variant: "destructive" });
        return;
      }

      try {
        const result = await handleFileUpload(data);
        if (result) {
          toast({ title: "Chapter created", description: "The chapter and audio file have been uploaded successfully." });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/all-chapters"] });
          queryClient.invalidateQueries({ queryKey: [`/api/assignments/${data.assignmentId}/chapters`] });
          chapterForm.reset();
          setSelectedFile(null);
          setSelectedJsonFile(null);
          setDialogType(null);
        }
      } catch (error) {
        console.error("Error creating chapter:", error);
      }
    }
  };

  // Dialog handlers
  const openDialog = (type: "course" | "assignment" | "chapter", item?: any, parentId?: string) => {
    setDialogType(type);
    setEditingItem(item || null);

    if (type === "course") {
      if (item) {
        courseForm.reset(item);
      } else {
        courseForm.reset({ code: "", name: "", description: "", isActive: true });
      }
    } else if (type === "assignment") {
      if (item) {
        assignmentForm.reset(item);
      } else {
        assignmentForm.reset({ courseId: parentId || "", title: "", description: "", orderIndex: 0 });
        setSelectedCourseForAssignment(parentId || "");
      }
    } else if (type === "chapter") {
      if (item) {
        chapterForm.reset(item);
        setSelectedJsonFile(null);
      } else {
        chapterForm.reset({ assignmentId: parentId || "", title: "", orderIndex: 0, duration: 0 });
        setSelectedAssignmentForChapter(parentId || "");
        setSelectedJsonFile(null);
      }
    }
  };

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "Unknown";
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (selectedCourseForAssignment) {
      assignmentForm.setValue("courseId", selectedCourseForAssignment);
    }
  }, [selectedCourseForAssignment]);

  useEffect(() => {
    if (selectedAssignmentForChapter) {
      chapterForm.setValue("assignmentId", selectedAssignmentForChapter);
    }
  }, [selectedAssignmentForChapter]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Management
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || (syncStatus as any)?.status === "in_progress"}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {syncMutation.isPending || (syncStatus as any)?.status === "in_progress" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderSync className="h-4 w-4" />
                )}
                Sync from API
              </Button>
              <Button onClick={() => openDialog("course")} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage all courses, assignments, and chapters in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coursesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : coursesWithData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No courses available</p>
              <p className="text-sm mt-2">Add a course manually or sync from the API</p>
            </div>
          ) : (
            <Accordion type="single" collapsible value={expandedCourse || undefined} onValueChange={(value) => setExpandedCourse(value)}>
              {coursesWithData.map((course) => (
                <AccordionItem key={course.id} value={course.id}>
                  <div className="flex items-center group">
                    <AccordionTrigger className="hover:no-underline flex-1 pr-2">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col items-start">
                          <div className="font-medium text-left">
                            {course.code ? `${course.code} - ${course.name}` : course.name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {course.assignments?.length || 0} assignment{(course.assignments?.length || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-1 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDialog("assignment", null, course.id);
                        }}
                        title="Add Assignment"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDialog("course", course);
                        }}
                        title="Edit Course"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteItem({ type: "course", item: course });
                        }}
                        title="Delete Course"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <AccordionContent>
                    <div className="pl-6 space-y-2">
                      {course.assignments?.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No assignments yet. Click + to add one.</p>
                      ) : (
                        <Accordion type="single" collapsible value={expandedAssignment || undefined} onValueChange={(value) => setExpandedAssignment(value)}>
                          {course.assignments?.map((assignment) => (
                            <AccordionItem key={assignment.id} value={assignment.id}>
                              <div className="flex items-center group">
                                <AccordionTrigger className="hover:no-underline flex-1 pr-2">
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex flex-col items-start">
                                      <div className="font-medium text-left">{assignment.title}</div>
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {assignment.chapters?.length || 0} chapter{(assignment.chapters?.length || 0) !== 1 ? 's' : ''}
                                      </div>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <div className="flex items-center gap-1 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDialog("chapter", null, assignment.id);
                                    }}
                                    title="Add Chapter"
                                  >
                                    <FileAudio className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDialog("assignment", assignment);
                                    }}
                                    title="Edit Assignment"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteItem({ type: "assignment", item: assignment });
                                    }}
                                    title="Delete Assignment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <AccordionContent>
                                <div className="pl-6 space-y-2">
                                  {assignment.chapters?.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-2">No chapters yet. Click the audio icon to add one.</p>
                                  ) : (
                                    assignment.chapters?.map((chapter) => (
                                      <div key={chapter.id} className="group flex items-center justify-between py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3 flex-1">
                                          <Music className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{chapter.title}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                              Duration: {formatDuration(chapter.duration)}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openDialog("chapter", chapter);
                                            }}
                                            title="Edit Chapter"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteItem({ type: "chapter", item: chapter });
                                            }}
                                            title="Delete Chapter"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Course Dialog */}
      <Dialog open={dialogType === "course"} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Course" : "Add New Course"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the course details" : "Create a new course"}
            </DialogDescription>
          </DialogHeader>
          <Form {...courseForm}>
            <form onSubmit={courseForm.handleSubmit(handleCourseSubmit)} className="space-y-4">
              <FormField
                control={courseForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CPCU 500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={courseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter course name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={courseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter course description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createCourseMutation.isPending || updateCourseMutation.isPending}>
                  {createCourseMutation.isPending || updateCourseMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={dialogType === "assignment"} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Assignment" : "Add New Assignment"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the assignment details" : "Create a new assignment"}
            </DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(handleAssignmentSubmit)} className="space-y-4">
              {!editingItem && (
                <FormField
                  control={assignmentForm.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {coursesWithData.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.code ? `${course.code} - ${course.name}` : course.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={assignmentForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter assignment title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter assignment description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignmentForm.control}
                name="orderIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Index</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>Lower numbers appear first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}>
                  {createAssignmentMutation.isPending || updateAssignmentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Chapter Dialog */}
      <Dialog open={dialogType === "chapter"} onOpenChange={(open) => {
        if (!open) {
          setDialogType(null);
          setSelectedFile(null);
          setSelectedJsonFile(null);
          setShowJsonContent(false);
          setShowAudioUpload(false);
          setShowJsonUpload(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Chapter" : "Upload Audio Chapter"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the chapter details" : "Create a new chapter with audio"}
            </DialogDescription>
          </DialogHeader>
          <Form {...chapterForm}>
            <form onSubmit={chapterForm.handleSubmit(handleChapterSubmit)} className="space-y-4">
              {!editingItem && (
                <FormField
                  control={chapterForm.control}
                  name="assignmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an assignment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {coursesWithData.flatMap(course => 
                            course.assignments?.map((assignment) => (
                              <SelectItem key={assignment.id} value={assignment.id}>
                                <div className="flex flex-col items-start w-full">
                                  <span className="font-medium">{assignment.title}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {course.code ? `${course.code} - ${course.name}` : course.name}
                                  </span>
                                </div>
                              </SelectItem>
                            )) || []
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={chapterForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chapter Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Chapter 1.1: Introduction" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={chapterForm.control}
                  name="orderIndex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Index</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Lower numbers appear first</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={chapterForm.control}
                  name="duration"
                  render={({ field }) => {
                    const totalSeconds = field.value || 0;
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;

                    const updateDuration = (newMinutes: number, newSeconds: number) => {
                      const total = newMinutes * 60 + newSeconds;
                      field.onChange(total);
                    };

                    return (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="0"
                              value={minutes || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const newMinutes = val === '' ? 0 : parseInt(val);
                                updateDuration(newMinutes, seconds);
                              }}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">min</span>
                            <Input
                              type="text"
                              placeholder="0"
                              value={seconds || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const newSeconds = val === '' ? 0 : Math.min(parseInt(val), 59);
                                updateDuration(minutes, newSeconds);
                              }}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">sec</span>
                          </div>
                        </FormControl>
                        <FormDescription>Audio duration in minutes and seconds</FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              {/* Show current content status when editing */}
              {editingItem && dialogType === "chapter" && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm">Current Content</h4>
                  
                  {/* Audio Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileAudio className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Audio File:</span>
                    </div>
                    {editingItem.audioUrl ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge>
                        <audio controls className="h-8" preload="none">
                          <source src={editingItem.audioUrl} type="audio/mpeg" />
                        </audio>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAudioUpload(!showAudioUpload)}
                          title="Change audio file"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <X className="h-3 w-3 mr-1" />
                          No audio
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAudioUpload(!showAudioUpload)}
                          title="Upload audio file"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Read-Along Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Read-Along Data:</span>
                    </div>
                    {editingItem.hasReadAlong ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/read-along/${editingItem.id}`, {
                                credentials: 'include'
                              });
                              if (response.ok) {
                                const data = await response.json();
                                setJsonContent(data);
                                setShowJsonContent(true);
                              } else {
                                console.error("Failed to fetch read-along data:", response.status);
                                toast({
                                  title: "Error",
                                  description: "Failed to fetch read-along data",
                                  variant: "destructive",
                                });
                              }
                            } catch (error) {
                              console.error("Error fetching read-along data:", error);
                              toast({
                                title: "Error",
                                description: "Failed to fetch read-along data",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View JSON
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowJsonUpload(!showJsonUpload)}
                          title="Change read-along data"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Not available
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowJsonUpload(!showJsonUpload)}
                          title="Upload read-along data"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Show audio upload when edit icon clicked */}
                  {showAudioUpload && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Replace Audio File</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedFile(file);
                              setShowAudioUpload(false);
                            }
                          }}
                        />
                        {selectedFile && (
                          <Badge variant="secondary">
                            <FileAudio className="h-3 w-3 mr-1" />
                            {selectedFile.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Show JSON upload when edit icon clicked */}
                  {showJsonUpload && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Replace Read-Along JSON File</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="application/json,.json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedJsonFile(file);
                              setShowJsonUpload(false);
                            }
                          }}
                        />
                        {selectedJsonFile && (
                          <Badge variant="secondary">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {selectedJsonFile.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!editingItem && (
                <div className="space-y-2">
                  <Label>Audio File</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                    />
                    {selectedFile && (
                      <Badge variant="secondary">
                        <FileAudio className="h-3 w-3 mr-1" />
                        {selectedFile.name}
                      </Badge>
                    )}
                  </div>
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-sm text-muted-foreground">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>
              )}
              {!editingItem && (
                <div className="space-y-2">
                  <Label>Read-Along JSON File (Optional)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedJsonFile(file);
                        }
                      }}
                    />
                    {selectedJsonFile && (
                      <Badge variant="secondary">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {selectedJsonFile.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a JSON file containing text content and timing segments for read-along functionality
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={isUploading || createChapterMutation.isPending || updateChapterMutation.isPending}>
                  {isUploading || createChapterMutation.isPending || updateChapterMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingItem ? "Saving..." : "Uploading..."}
                    </>
                  ) : (
                    <>{editingItem ? "Save" : "Upload Chapter"}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteItem?.type} "{deleteItem?.item?.name || deleteItem?.item?.title}".
              {deleteItem?.type === "course" && " All assignments and chapters within this course will also be deleted."}
              {deleteItem?.type === "assignment" && " All chapters within this assignment will also be deleted."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteItem?.type === "course") {
                  deleteCourseMutation.mutate(deleteItem.item.id);
                } else if (deleteItem?.type === "assignment") {
                  deleteAssignmentMutation.mutate(deleteItem.item.id);
                } else if (deleteItem?.type === "chapter") {
                  deleteChapterMutation.mutate(deleteItem.item.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* JSON Content Viewer Dialog - Nested to preserve parent dialog */}
      <Dialog open={showJsonContent} onOpenChange={(open) => {
        setShowJsonContent(open);
        if (!open && dialogType === "chapter") {
          // Keep the chapter dialog open when closing JSON viewer
          // The parent dialog remains open
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Read-Along Data</DialogTitle>
            <DialogDescription>
              JSON content for {editingItem?.title || "this chapter"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            {jsonContent && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Text Content</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {jsonContent.textContent ? 
                      (jsonContent.textContent.length > 500 
                        ? jsonContent.textContent.substring(0, 500) + "..."
                        : jsonContent.textContent)
                      : "No text content"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Segments ({jsonContent.segments?.length || 0} total)</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {jsonContent.segments?.slice(0, 10).map((segment: any, index: number) => (
                      <div key={index} className="p-3 bg-muted rounded text-xs space-y-1">
                        <div className="flex justify-between">
                          <Badge variant="outline" className="text-xs">
                            Segment {segment.segmentIndex}
                          </Badge>
                          <span className="text-muted-foreground">
                            {segment.startTime}s - {segment.endTime}s
                          </span>
                        </div>
                        <p className="text-muted-foreground">{segment.text}</p>
                      </div>
                    ))}
                    {jsonContent.segments?.length > 10 && (
                      <p className="text-center text-muted-foreground text-sm">
                        ... and {jsonContent.segments.length - 10} more segments
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowJsonContent(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}