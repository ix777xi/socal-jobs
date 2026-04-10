import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bookmark, BookmarkCheck, MapPin, Building2, DollarSign,
  Clock, ExternalLink, Zap, Trash2,
} from "lucide-react";
import type { Job } from "@shared/schema";

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SavedPage() {
  const { toast } = useToast();

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs", { saved: true }],
    queryFn: async () => {
      const resp = await apiRequest("GET", "/api/jobs?saved=true&limit=100");
      return resp.json();
    },
    refetchInterval: 30000,
  });

  const unsaveMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await apiRequest("POST", `/api/jobs/${id}/save`);
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job removed from saved" });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold">Saved Jobs</h2>
        <p className="text-xs text-muted-foreground">{jobs.length} saved job{jobs.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="space-y-2 animate-pulse"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></CardContent></Card>
          ))
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No saved jobs yet</p>
              <p className="text-xs text-muted-foreground mt-1">Bookmark jobs from the feed to see them here</p>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className={`${job.isUrgent ? "border-l-2 border-l-red-500" : ""}`} data-testid={`saved-job-${job.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{job.title}</h3>
                      {job.isUrgent && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                          <Zap className="w-3 h-3 mr-0.5" />URGENT
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.company}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {job.payRange && (
                        <Badge variant="secondary" className="text-[11px] font-medium">
                          <DollarSign className="w-3 h-3 mr-0.5" />{job.payRange}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[11px]">{job.trade}</Badge>
                      <span className="text-[11px] text-muted-foreground ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />{getTimeAgo(job.fetchedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => unsaveMutation.mutate(job.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                      data-testid={`button-unsave-${job.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-accent transition-colors">
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
