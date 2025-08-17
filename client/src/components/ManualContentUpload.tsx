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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

export function ManualContentUpload() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("courses");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Queries
  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: allAssignments = [], isLoading: assignmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/all-assignments"],
  });

  // Course form
  const courseForm = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Assignment form
  const assignmentForm = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      courseId: "",
      title: "",
      description: "",
      orderIndex: 0,
    },
  });

  // Chapter form
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

  // Mutations
  const createCourseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof courseSchema>) => {
      return await apiRequest("POST", "/api/admin/courses", data);
    },
    onSuccess: () => {
      toast({
        title: "Course created",
        description: "The course has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      courseForm.reset();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Course> }) => {
      return await apiRequest("PUT", `/api/admin/courses/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Course updated",
        description: "The course has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setEditingItem(null);
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/courses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Course deleted",
        description: "The course has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentSchema>) => {
      return await apiRequest("POST", "/api/admin/assignments", data);
    },
    onSuccess: () => {
      toast({
        title: "Assignment created",
        description: "The assignment has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-assignments"] });
      assignmentForm.reset();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof chapterSchema> & { audioUrl: string }) => {
      return await apiRequest("POST", "/api/admin/chapters", data);
    },
    onSuccess: () => {
      toast({
        title: "Chapter created",
        description: "The chapter has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      chapterForm.reset();
      setSelectedFile(null);
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an audio file to upload.",
        variant: "destructive",
      });
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("audio", selectedFile);

    // Create a temporary chapter first to get the ID
    const chapterData = chapterForm.getValues();
    
    try {
      // First create the chapter with a placeholder URL
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
      toast({
        title: "Upload failed",
        description: "Failed to upload audio file. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCourseSubmit = (data: z.infer<typeof courseSchema>) => {
    if (editingItem) {
      updateCourseMutation.mutate({ id: editingItem.id, data });
    } else {
      createCourseMutation.mutate(data);
    }
  };

  const handleAssignmentSubmit = (data: z.infer<typeof assignmentSchema>) => {
    createAssignmentMutation.mutate(data);
  };

  const handleChapterSubmit = async (data: z.infer<typeof chapterSchema>) => {
    if (!selectedFile) {
      toast({
        title: "No audio file",
        description: "Please select an audio file for the chapter.",
        variant: "destructive",
      });
      return;
    }

    try {
      const audioUrl = await handleFileUpload();
      if (audioUrl) {
        // Chapter is already created in handleFileUpload
        toast({
          title: "Chapter created",
          description: "The chapter and audio file have been uploaded successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
        chapterForm.reset();
        setSelectedFile(null);
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Error creating chapter:", error);
    }
  };

  useEffect(() => {
    if (editingItem && activeTab === "courses") {
      courseForm.reset(editingItem);
    }
  }, [editingItem]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Manual Content Management
          </CardTitle>
          <CardDescription>
            Manually add courses, assignments, and upload audio chapters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="chapters">Chapters</TabsTrigger>
            </TabsList>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Manage Courses</h3>
                <Dialog open={dialogOpen && activeTab === "courses"} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingItem(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? "Edit Course" : "Add New Course"}
                      </DialogTitle>
                      <DialogDescription>
                        Enter the course details below
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
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : courses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No courses found. Add your first course.
                        </TableCell>
                      </TableRow>
                    ) : (
                      courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.code || "-"}</TableCell>
                          <TableCell>{course.name}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {course.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={course.isActive ? "default" : "secondary"}>
                              {course.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingItem(course);
                                  setDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteCourseMutation.mutate(course.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Manage Assignments</h3>
                <Dialog open={dialogOpen && activeTab === "assignments"} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Assignment</DialogTitle>
                      <DialogDescription>
                        Create a new assignment for a course
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...assignmentForm}>
                      <form onSubmit={assignmentForm.handleSubmit(handleAssignmentSubmit)} className="space-y-4">
                        <FormField
                          control={assignmentForm.control}
                          name="courseId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Course</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {courses.map((course) => (
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
                              <FormDescription>
                                Lower numbers appear first
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createAssignmentMutation.isPending}>
                            {createAssignmentMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>Create Assignment</>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Assignment Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : allAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No assignments found. Add your first assignment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allAssignments.map((assignment: any) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {assignment.courseCode ? `${assignment.courseCode} - ${assignment.courseName}` : assignment.courseName}
                          </TableCell>
                          <TableCell>{assignment.title}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {assignment.description || "-"}
                          </TableCell>
                          <TableCell>{assignment.orderIndex}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Chapters Tab */}
            <TabsContent value="chapters" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Upload Audio Chapters</h3>
                <Dialog open={dialogOpen && activeTab === "chapters"} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <FileAudio className="h-4 w-4 mr-2" />
                      Upload Chapter
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload Audio Chapter</DialogTitle>
                      <DialogDescription>
                        Select an assignment and upload an audio file for the chapter
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...chapterForm}>
                      <form onSubmit={chapterForm.handleSubmit(handleChapterSubmit)} className="space-y-4">
                        <FormField
                          control={chapterForm.control}
                          name="assignmentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assignment</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an assignment" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {allAssignments.map((assignment: any) => (
                                    <SelectItem key={assignment.id} value={assignment.id}>
                                      <div className="flex flex-col">
                                        <span>{assignment.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {assignment.courseCode ? `${assignment.courseCode} - ${assignment.courseName}` : assignment.courseName}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                                <FormDescription>
                                  Lower numbers appear first
                                </FormDescription>
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
                                <FormDescription>
                                  Audio duration in seconds
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
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
                        <DialogFooter>
                          <Button type="submit" disabled={isUploading || createChapterMutation.isPending}>
                            {isUploading || createChapterMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>Upload Chapter</>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Instructions</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Select an assignment from the dropdown</li>
                  <li>Enter the chapter title and description</li>
                  <li>Set the order index (lower numbers appear first)</li>
                  <li>Select an audio file (MP3, WAV, OGG, or WebM)</li>
                  <li>Click "Upload Chapter" to save</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}