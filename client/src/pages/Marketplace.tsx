import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import JobCard from "@/components/JobCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { VOCATION_KEYS, VOCATION_LABELS, type VocationKey } from "@shared/vocations";

export default function Marketplace() {
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [vocation, setVocation] = useState<string>(params.get("vocation") ?? "");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<string>("open");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  const { data: jobs, isLoading, refetch } = trpc.jobs.list.useQuery({
    vocation: vocation || undefined,
    location: location || undefined,
    status: (status as any) || undefined,
    minBudget: minBudget ? Number(minBudget) : undefined,
    maxBudget: maxBudget ? Number(maxBudget) : undefined,
    limit: LIMIT,
    offset,
  });

  const clearFilters = () => {
    setVocation("");
    setLocation("");
    setStatus("open");
    setMinBudget("");
    setMaxBudget("");
    setOffset(0);
  };

  const hasActiveFilters = vocation || location || status !== "open" || minBudget || maxBudget;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      {/* Header */}
      <div className="border-b border-white/5 bg-[#131a26]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
          <h1
            className="text-3xl font-extrabold text-white mb-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Job Marketplace
          </h1>
          <p className="text-gray-400 text-sm">
            Browse open jobs across 12 skilled trade vocations
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        {/* Filter Bar */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-3 flex-wrap">
            {/* Vocation filter */}
            <Select value={vocation} onValueChange={(v) => { setVocation(v === "all" ? "" : v); setOffset(0); }}>
              <SelectTrigger className="w-[200px] bg-[#131a26] border-white/10 text-gray-300 focus:border-violet-500/50">
                <SelectValue placeholder="All Vocations" />
              </SelectTrigger>
              <SelectContent className="bg-[#131a26] border-white/10">
                <SelectItem value="all" className="text-gray-300">All Vocations</SelectItem>
                {VOCATION_KEYS.map((key) => (
                  <SelectItem key={key} value={key} className="text-gray-300">
                    {VOCATION_LABELS[key as VocationKey]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setOffset(0); }}>
              <SelectTrigger className="w-[160px] bg-[#131a26] border-white/10 text-gray-300 focus:border-violet-500/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#131a26] border-white/10">
                <SelectItem value="all" className="text-gray-300">All Statuses</SelectItem>
                <SelectItem value="open" className="text-gray-300">Open</SelectItem>
                <SelectItem value="in_progress" className="text-gray-300">In Progress</SelectItem>
                <SelectItem value="completed" className="text-gray-300">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Location search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by location..."
                value={location}
                onChange={(e) => { setLocation(e.target.value); setOffset(0); }}
                className="pl-9 bg-[#131a26] border-white/10 text-gray-300 placeholder:text-gray-600 focus:border-violet-500/50"
              />
            </div>

            {/* Advanced filters toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-white/10 text-gray-400 hover:text-white hover:border-violet-500/30 bg-transparent"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Budget
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Budget filters */}
          {showFilters && (
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  placeholder="Min budget"
                  value={minBudget}
                  onChange={(e) => { setMinBudget(e.target.value); setOffset(0); }}
                  className="pl-7 w-[140px] bg-[#131a26] border-white/10 text-gray-300 placeholder:text-gray-600 focus:border-violet-500/50"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  placeholder="Max budget"
                  value={maxBudget}
                  onChange={(e) => { setMaxBudget(e.target.value); setOffset(0); }}
                  className="pl-7 w-[140px] bg-[#131a26] border-white/10 text-gray-300 placeholder:text-gray-600 focus:border-violet-500/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : jobs && jobs.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {offset + 1}–{Math.min(offset + jobs.length, offset + LIMIT)} results
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  id={job.id}
                  title={job.title}
                  vocation={job.vocation}
                  location={job.location}
                  budget={job.budget}
                  status={job.status}
                  isUrgent={job.isUrgent}
                  createdAt={job.createdAt}
                  description={job.description}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                className="border-white/10 text-gray-400 hover:text-white bg-transparent disabled:opacity-30"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">Page {Math.floor(offset / LIMIT) + 1}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={jobs.length < LIMIT}
                onClick={() => setOffset(offset + LIMIT)}
                className="border-white/10 text-gray-400 hover:text-white bg-transparent disabled:opacity-30"
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-gray-500 text-sm mb-6">
              {hasActiveFilters
                ? "Try adjusting your filters to see more results."
                : "No jobs have been posted yet. Be the first to post one!"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="border-white/10 text-gray-400 hover:text-white bg-transparent"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
