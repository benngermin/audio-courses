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
  description: z.string().optional(),
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
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
      description: "",
      orderIndex: 0,
      duration: 0,
    },
  });

  // Load all assignments
  const { data: allAssignments = [] } = useQuery<Assignment[]>({
    queryKey: ["/api/admin/all-assignments"],
  });

  // Load all chapters
  const { data: allChapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/admin/all-chapters"],
  });

  // Organize data hierarchically
  const coursesWithData = courses.map(course => {
    const courseAssignments = allAssignments
      .filter(a => a.courseId === course.id)
      .map(assignment => {
        const assignmentChapters = allChapters.filter(c => c.assignmentId === assignment.id);
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
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      setEditingItem(null);
      setDialogType(null);
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
    },
    onError: (error) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    },
  });

  // File upload handler
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select an audio file to upload.", variant: "destructive" });
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("audio", selectedFile);

    try {
      // First create the chapter with a placeholder URL
      const chapterData = chapterForm.getValues();
      const newChapter = await apiRequest("POST", "/api/admin/chapters", {
        ...chapterData,
        audioUrl: "uploading...",
      });

      // Then upload the audio file
      formData.append("chapterId", (newChapter as any).id);

      const response = await fetch("/api/admin/upload-audio", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to upload audio file");
      }

      const result = await response.json();
      setUploadProgress(100);
      setIsUploading(false);

      return result.audioUrl;
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
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
      updateChapterMutation.mutate({ id: editingItem.id, data });
    } else {
      if (!selectedFile) {
        toast({ title: "No audio file", description: "Please select an audio file for the chapter.", variant: "destructive" });
        return;
      }

      try {
        const audioUrl = await handleFileUpload();
        if (audioUrl) {
          toast({ title: "Chapter created", description: "The chapter and audio file have been uploaded successfully." });
          queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
          chapterForm.reset();
          setSelectedFile(null);
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
      } else {
        chapterForm.reset({ assignmentId: parentId || "", title: "", description: "", orderIndex: 0, duration: 0 });
        setSelectedAssignmentForChapter(parentId || "");
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
              Unified Content Management
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || syncStatus?.status === "in_progress"}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {syncMutation.isPending || syncStatus?.status === "in_progress" ? (
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
                  <div className="flex items-center">
                    <AccordionTrigger className="hover:no-underline flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-left">
                            {course.code ? `${course.code} - ${course.name}` : course.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {course.assignments?.length || 0} assignments
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-2 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog("assignment", null, course.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog("course", course)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteItem({ type: "course", item: course })}
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
                              <div className="flex items-center">
                                <AccordionTrigger className="hover:no-underline flex-1">
                                  <div>
                                    <div className="font-medium text-left">{assignment.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {assignment.chapters?.length || 0} chapters
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <div className="flex items-center gap-2 px-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDialog("chapter", null, assignment.id)}
                                  >
                                    <FileAudio className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDialog("assignment", assignment)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteItem({ type: "assignment", item: assignment })}
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
                                      <div key={chapter.id} className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <Music className="h-4 w-4 text-muted-foreground" />
                                          <div>
                                            <div className="text-sm font-medium">{chapter.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                              Duration: {formatDuration(chapter.duration)}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openDialog("chapter", chapter)}
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteItem({ type: "chapter", item: chapter })}
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
      <Dialog open={dialogType === "chapter"} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-2xl">
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
                                <div className="flex flex-col">
                                  <span>{assignment.title}</span>
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
              <FormField
                control={chapterForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter chapter description" {...field} />
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (seconds)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Audio duration in seconds</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
    </div>
  );
}