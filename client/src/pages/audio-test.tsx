import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function AudioTest() {
  const [audioUrl, setAudioUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Fetch chapters to get audio URLs
  const { data: chapters = [] } = useQuery({
    queryKey: ["/api/assignments", "4f53a908-4427-44fa-a77e-156b5fc5b427", "chapters"],
  });

  const testAudio = (url: string) => {
    console.log("Testing audio URL:", url);
    setAudioUrl(url);
    
    // Create and play audio element directly
    const audio = new Audio(url);
    audio.volume = 1;
    
    audio.addEventListener('play', () => {
      console.log('Audio started playing');
      setIsPlaying(true);
    });
    
    audio.addEventListener('pause', () => {
      console.log('Audio paused');
      setIsPlaying(false);
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      alert(`Audio error: ${(e.target as HTMLAudioElement).error?.message || 'Unknown error'}`);
    });
    
    audio.play()
      .then(() => {
        console.log('Play promise resolved');
        alert('Audio is playing! Check if you can hear it.');
      })
      .catch((error) => {
        console.error('Play promise rejected:', error);
        alert(`Failed to play: ${error.message}`);
      });
    
    // Store reference for stopping
    (window as any).testAudio = audio;
  };
  
  const stopAudio = () => {
    const audio = (window as any).testAudio;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Audio Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <p className="mb-2">Current audio URL: {audioUrl || "None"}</p>
        <p>Status: {isPlaying ? "Playing" : "Not playing"}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Test with HTML Audio Element</h2>
        <audio 
          controls 
          className="w-full mb-4"
          data-testid="audio-element"
        >
          <source src="/uploads/audio/1756148496753-temp-1756148496753-4ojxm8lu0ft.mp3" type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Available Chapters</h2>
        <div className="space-y-2">
          {chapters.map((chapter: any) => (
            <div key={chapter.id} className="p-3 border rounded">
              <p className="font-medium">{chapter.title}</p>
              <p className="text-sm text-gray-600 mb-2">{chapter.audioUrl}</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => testAudio(chapter.audioUrl)}
                  data-testid={`test-audio-${chapter.id}`}
                >
                  Test Audio with JS
                </Button>
                <Button 
                  onClick={stopAudio}
                  variant="outline"
                  data-testid={`stop-audio-${chapter.id}`}
                >
                  Stop
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2">Debug Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Try the HTML audio element first - can you see the controls and play it?</li>
          <li>Click "Test Audio with JS" for each chapter</li>
          <li>Check browser console for any errors</li>
          <li>Check if you hear any sound</li>
          <li>Try adjusting your system volume</li>
        </ol>
      </div>
    </div>
  );
}