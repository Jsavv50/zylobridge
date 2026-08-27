import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { VOCATION_CATEGORIES, getVocationLabel, searchVocations, type VocationKey } from "@shared/vocations";

interface VocationSelectorProps {
  value: string;
  onChange: (value: VocationKey) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

export default function VocationSelector({ value, onChange, id, placeholder = "Select a vocation", className }: VocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedLabel = getVocationLabel(value);
  const filtered = useMemo(() => searchVocations(query), [query]);
  const groups = useMemo(() => VOCATION_CATEGORIES.map((category) => ({
    ...category,
    options: filtered.filter((option) => option.category === category.label),
  })).filter((category) => category.options.length > 0), [filtered]);

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" aria-haspopup="listbox" aria-expanded={open} className={cn("h-10 w-full justify-between border-white/10 bg-[#0a0f1a] text-left font-normal text-white hover:bg-[#0a0f1a]", !value && "text-gray-500", className)}>
          <span className="truncate">{value ? selectedLabel : placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(36rem,calc(100vw-2rem))] overflow-hidden border-white/10 bg-[#131a26] p-0 text-white">
        <Command shouldFilter={false} className="bg-[#131a26] text-white">
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search vocation..." aria-label="Search vocation" className="text-white" />
          <CommandList className="max-h-[min(24rem,65vh)]">
            <CommandEmpty>No vocations match your search.</CommandEmpty>
            {groups.map((category) => (
              <CommandGroup key={category.key} heading={`${category.icon} ${category.label}`}>
                {category.options.map((option) => (
                  <CommandItem key={`${category.key}-${option.key}`} value={option.key} onSelect={() => { onChange(option.key); setOpen(false); setQuery(""); }} className="items-start gap-3 py-2.5 text-white">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0 text-violet-300", value === option.key ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0"><span className="block truncate">{option.label}</span><span className="block text-xs text-gray-500">{option.category}</span></span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
