import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Headphones, Play, BookOpen, Download } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Headphones className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold text-slate-800">
                The Institutes Audio Learning
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Learn on the Go
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Access your course materials anywhere with our mobile-first audio learning platform. 
            Perfect for commuting, exercising, or any time you want to learn.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => window.location.href = "/api/login"}
          >
            <Play className="mr-2 h-5 w-5" />
            Start Learning
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                Audio First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                High-quality audio content designed for mobile learning. 
                Listen while commuting, exercising, or multitasking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Offline Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Download chapters for offline listening. Never let poor 
                connectivity interrupt your learning journey.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Structured Learning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Organized by course, assignment, and chapter. 
                Track your progress and pick up where you left off.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Course Preview */}
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-slate-800 mb-4">
            The Institutes Courses
          </h3>
          <p className="text-slate-600 mb-6">
            Access professional development content from The Institutes, 
            delivered in an engaging audio format perfect for busy professionals.
          </p>
          
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-slate-800">
                    AIC 300: Claims in an Evolving World
                  </h4>
                  <p className="text-sm text-slate-500">
                    3 assignments • 26 chapters
                  </p>
                </div>
              </div>
              <Button 
                className="w-full"
                onClick={() => window.location.href = "/api/login"}
              >
                Access Course
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="text-center text-slate-500">
            <p>&copy; 2024 The Institutes. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
