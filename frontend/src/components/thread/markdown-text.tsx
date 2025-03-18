"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  CodeHeaderProps,
  useIsMarkdownCodeBlock
} from "@assistant-ui/react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
// import * as React from "react";
import { FC, memo, useState, useMemo } from "react";
import { CheckIcon, CopyIcon, MapPinIcon, DollarSignIcon } from "lucide-react";
import { SyntaxHighlighter } from "@/components/thread/syntax-highlighter";

import { TooltipIconButton } from "@/components/thread/tooltip-icon-button";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";

// Function to detect and format itineraries
const formatItinerary = (content: string): string => {
  // Check if content looks like an itinerary
  if (content.includes("Day 1:") && (content.includes("Day 2:") || content.includes("Day 3:"))) {
    let formattedContent = content;
    
    // Add itinerary header
    if (content.includes("itinerary")) {
      formattedContent = `# 🧳 Travel Itinerary\n\n${formattedContent}`;
    }
    
    // Format day headers with emojis and make them collapsible sections
    formattedContent = formattedContent.replace(/Day (\d+): ([^\n]+)/g, '## 🗓️ Day $1: $2');
    
    // Format time periods - ensure they're properly formatted as list items
    formattedContent = formattedContent.replace(/\n(Morning|Afternoon|Evening):/g, '\n\n### 🕒 $1:\n');
    
    // Add emojis to common travel activities and places
    const replacements = [
      { pattern: /Temple/g, replacement: '🛕 Temple' },
      { pattern: /Museum/g, replacement: '🏛️ Museum' },
      { pattern: /Gardens/g, replacement: '🌸 Gardens' },
      { pattern: /Lunch/g, replacement: '🍽️ Lunch' },
      { pattern: /Dinner/g, replacement: '🍲 Dinner' },
      { pattern: /Cultural Show/g, replacement: '🎭 Cultural Show' },
      { pattern: /Sanctuary/g, replacement: '🌳 Sanctuary' },
      { pattern: /Buddha/g, replacement: '🧘 Buddha' },
      { pattern: /Elephant/g, replacement: '🐘 Elephant' },
      { pattern: /Beach/g, replacement: '🏖️ Beach' },
      { pattern: /Hotel/g, replacement: '🏨 Hotel' },
      { pattern: /Restaurant/g, replacement: '🍴 Restaurant' },
      { pattern: /Market/g, replacement: '🛍️ Market' },
      { pattern: /Tour/g, replacement: '🧭 Tour' },
      { pattern: /Lake/g, replacement: '💦 Lake' },
      { pattern: /Mountain/g, replacement: '⛰️ Mountain' },
      { pattern: /Park/g, replacement: '🌳 Park' },
      { pattern: /Fort/g, replacement: '🏰 Fort' },
      // Sri Lanka specific additions
      { pattern: /Tea Plantation/g, replacement: '🍵 Tea Plantation' },
      { pattern: /Stilt Fishermen/g, replacement: '🎣 Stilt Fishermen' },
      { pattern: /Ayurveda/g, replacement: '🌿 Ayurveda' },
      { pattern: /Spice Garden/g, replacement: '🌶️ Spice Garden' },
      { pattern: /Sigiriya/g, replacement: '🗿 Sigiriya' },
      { pattern: /Kandy/g, replacement: '🏞️ Kandy' },
      { pattern: /Colombo/g, replacement: '🏙️ Colombo' },
      { pattern: /Galle/g, replacement: '🏛️ Galle' },
      
      // Transportation types in Sri Lanka
      { pattern: /Tuk Tuk/g, replacement: '🛺 Tuk Tuk' },
      { pattern: /Tuk-Tuk/g, replacement: '🛺 Tuk-Tuk' },
      { pattern: /Train/g, replacement: '🚂 Train' },
      { pattern: /Bus/g, replacement: '🚌 Bus' },
      { pattern: /Taxi/g, replacement: '🚕 Taxi' },
      { pattern: /Rickshaw/g, replacement: '🛺 Rickshaw' },
      { pattern: /Auto Rickshaw/g, replacement: '🛺 Auto Rickshaw' },
      { pattern: /Ferry/g, replacement: '⛴️ Ferry' },
      { pattern: /Boat/g, replacement: '🚣 Boat' },
      { pattern: /Bicycle/g, replacement: '🚲 Bicycle' },
      { pattern: /Bike/g, replacement: '🏍️ Bike' },
      { pattern: /Scooter/g, replacement: '🛵 Scooter' },
      { pattern: /Motorcycle/g, replacement: '🏍️ Motorcycle' },
      { pattern: /Car Rental/g, replacement: '🚗 Car Rental' },
      { pattern: /Private Driver/g, replacement: '🚘 Private Driver' },
      { pattern: /Scenic Train/g, replacement: '🚂 Scenic Train' },
      { pattern: /Train/g, replacement: '���2 Train' },
      { pattern: /Airport Transfer/g, replacement: '🚐 Airport Transfer' },
      
      { pattern: /Safari/g, replacement: '🦁 Safari' },
      { pattern: /Whale Watching/g, replacement: '🐋 Whale Watching' },
      { pattern: /Surfing/g, replacement: '🏄 Surfing' },
      { pattern: /Hiking/g, replacement: '🥾 Hiking' },
      { pattern: /Waterfall/g, replacement: '💦 Waterfall' },
      { pattern: /Gem Mining/g, replacement: '💎 Gem Mining' },
      { pattern: /Batik/g, replacement: '🧵 Batik' },
      { pattern: /Mask Carving/g, replacement: '🎭 Mask Carving' },
      { pattern: /Cinnamon/g, replacement: '🌱 Cinnamon' },
      { pattern: /Coconut/g, replacement: '🥥 Coconut' },
      { pattern: /Rice and Curry/g, replacement: '🍛 Rice and Curry' },
      { pattern: /Hoppers/g, replacement: '🥞 Hoppers' },
      { pattern: /Kottu/g, replacement: '🍲 Kottu' },
      { pattern: /Poya/g, replacement: '🌕 Poya' },
      { pattern: /Perahera/g, replacement: '🐘 Perahera' },

      // Time-related patterns
      { pattern: /(\d+):(\d+)\s*(AM|PM)/gi, replacement: '🕒 $1:$2 $3' },
      { pattern: /(\d+)\s*(AM|PM)/gi, replacement: '🕒 $1 $2' },
      { pattern: /Early Morning/gi, replacement: '🌅 Early Morning' },
      { pattern: /Late Morning/gi, replacement: '🌤️ Late Morning' },
      { pattern: /Noon/gi, replacement: '🌞 Noon' },
      { pattern: /Midday/gi, replacement: '☀️ Midday' },
      { pattern: /Early Afternoon/gi, replacement: '🌇 Early Afternoon' },
      { pattern: /Late Afternoon/gi, replacement: '🌆 Late Afternoon' },
      { pattern: /Evening/gi, replacement: '🌃 Evening' },
      { pattern: /Night/gi, replacement: '🌙 Night' },
      { pattern: /Sunrise/gi, replacement: '🌄 Sunrise' },
      { pattern: /Sunset/gi, replacement: '🌅 Sunset' },
      { pattern: /Overnight/gi, replacement: '🌉 Overnight' },
      { pattern: /Duration: (\d+)/gi, replacement: '⏱️ Duration: $1' },
      { pattern: /(\d+) hour/gi, replacement: '⏱️ $1 hour' },
      { pattern: /(\d+) minute/gi, replacement: '⏱️ $1 minute' },
      { pattern: /Check-in/gi, replacement: '🛎️ Check-in' },
      { pattern: /Check-out/gi, replacement: '👋 Check-out' },
      { pattern: /Departure/gi, replacement: '🛫 Departure' },
      { pattern: /Arrival/gi, replacement: '🛬 Arrival' },
    ];
    
    replacements.forEach(({ pattern, replacement }) => {
      formattedContent = formattedContent.replace(pattern, replacement);
    });
    
    // Format tips section
    formattedContent = formattedContent.replace(/Tips:/g, '## 💡 Tips:');
    
    // Format costs if they exist (assuming costs might be mentioned with $ or Rs.)
    formattedContent = formattedContent.replace(/(\$\d+|\d+ Rs\.)/g, '**$1**');
    
    // Remove the HTML wrapper - we'll handle styling in the component instead
    
    // Improve list formatting - ensure proper markdown list structure
    const lines = formattedContent.split('\n');
    const formattedLines = lines.map((line, index) => {
      // Skip headings and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        return line;
      }
      
      // If line contains a place name with a colon but isn't already a list item
      if (line.includes(':') && !line.trim().startsWith('*') && !line.trim().startsWith('-')) {
        // Check if it's under a time period heading (Morning, Afternoon, Evening)
        const prevLine = index > 0 ? lines[index-1] : '';
        if (prevLine.includes('### 🕒') || (index > 1 && lines[index-2].includes('### 🕒'))) {
          return `* ${line}`;
        }
      }
      
      return line;
    });
    
    return formattedLines.join('\n');
  }
  
  return content;
};

const MarkdownTextImpl = ({ children, className }: { children: string; className?: string }) => {
  // Process itinerary content to enhance formatting
  const enhancedContent = useMemo(() => formatItinerary(children), [children]);
  
  // Create a styled container for itineraries
  const isItinerary = children.includes("Day 1:") && (children.includes("Day 2:") || children.includes("Day 3:"));
  
  return (
    <div className={cn("prose dark:prose-invert max-w-none", className)}>
      {isItinerary ? (
        <div className="py-3 px-4 bg-[#FFF5E1] text-[#1A3A5F] rounded-xl border border-[#D68060]/30 shadow-md">
          <div className="relative">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter
                      language={match[1]}
                      PreTag="div"
                      {...props}
                      style={{}}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={cn("bg-[#D2691E]/10 text-[#1A3A5F] px-1 py-0.5 rounded", className)} {...props}>
                      {children}
                    </code>
                  );
                },
                img({ node, ...props }: any) {
                  return (
                    <div className="my-4 overflow-hidden rounded-lg border-4 border-[#D68060] shadow-[4px_4px_0px_0px_#000]">
                      <img 
                        {...props} 
                        className="w-full h-auto object-cover transition-transform hover:scale-105 duration-300"
                        loading="lazy"
                        alt={props.alt || "Sri Lanka travel image"}
                      />
                      {props.alt && (
                        <div className="bg-[#1A3A5F] text-[#FFF5E1] py-2 px-3 text-sm font-medium">
                          {props.alt}
                        </div>
                      )}
                    </div>
                  );
                },
                a({ node, ...props }: any) {
                  return (
                    <a 
                      {...props} 
                      className="text-[#D68060] font-medium hover:text-[#1A3A5F] underline transition-colors duration-200"
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {props.children}
                    </a>
                  );
                },
                ul({ node, ...props }: any) {
                  return <ul className="list-disc pl-5 space-y-1 my-2" {...props} />;
                },
                ol({ node, ...props }: any) {
                  return <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />;
                },
                li({ node, ...props }: any) {
                  return (
                    <li className="marker:text-[#D68060] mb-2 pl-1 border-l-2 border-[#D68060]/30 py-0.5 text-[#1A3A5F]" {...props} />
                  );
                },
                h1({ node, ...props }: any) {
                  return (
                    <h1 
                      {...props} 
                      className="text-2xl font-bold text-[#D68060] border-b-2 border-[#D68060]/30 pb-2 mb-4"
                    />
                  );
                },
                h2({ node, ...props }: any) {
                  const content = props.children?.toString() || '';
                  const isDayHeading = content.includes('Day');
                  
                  return (
                    <div className="mt-6 mb-3">
                      <h2 
                        {...props} 
                        className={cn(
                          "text-xl font-semibold flex items-center gap-2 p-2 rounded-t-lg",
                          isDayHeading ? "bg-[#D68060]/20 border-l-4 border-[#D68060] text-[#1A3A5F]" : "text-[#D68060]"
                        )}
                      />
                      {isDayHeading && <div className="h-0.5 bg-[#D68060] w-full opacity-30 rounded-b-lg mb-3"></div>}
                    </div>
                  );
                },
                h3({ node, ...props }: any) {
                  const content = props.children?.toString() || '';
                  const isTimeHeading = content.includes('Morning') || content.includes('Afternoon') || content.includes('Evening');
                  
                  return (
                    <h3 
                      {...props} 
                      className={cn(
                        "text-lg font-medium mt-4 mb-2 flex items-center gap-2",
                        isTimeHeading ? "text-[#1A3A5F] bg-[#D68060]/10 p-1.5 rounded-lg border-l-3 border-[#D68060] font-bold" : "text-[#1A3A5F]"
                      )}
                    />
                  );
                },
                p({ node, ...props }: any) {
                  const content = props.children?.toString() || '';
                  
                  // Check if paragraph contains cost information
                  const hasCost = /(\$\d+|\d+ Rs\.)/.test(content);
                  
                  // Check if paragraph is about a place (contains location keywords)
                  const isPlace = /(visit|located|explore|see|view|experience)/.test(content.toLowerCase());
                  
                  if (hasCost) {
                    return (
                      <div className="my-2 p-2 bg-[#D68060]/10 rounded-lg border-l-4 border-[#D68060] flex items-center">
                        <DollarSignIcon className="text-[#D68060] mr-2 flex-shrink-0" size={16} />
                        <p {...props} className="m-0 text-[#1A3A5F] font-normal opacity-100" />
                      </div>
                    );
                  } else if (isPlace && content.length > 50) {
                    return (
                      <div className="my-2 p-2 bg-[#D68060]/5 rounded-lg border-l-4 border-[#1A3A5F] flex items-start">
                        <MapPinIcon className="text-[#1A3A5F] mr-2 mt-1 flex-shrink-0" size={16} />
                        <p {...props} className="m-0 text-[#1A3A5F] font-normal opacity-100" />
                      </div>
                    );
                  }
                  
                  return <p {...props} className="my-1.5 text-[#1A3A5F] font-normal opacity-100" />;
                },
              }}
            >
              {enhancedContent}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  language={match[1]}
                  PreTag="div"
                  {...props}
                  style={{}}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={cn("bg-[#FFF5E1] text-[#1A3A5F] px-1 py-0.5 rounded", className)} {...props}>
                  {children}
                </code>
              );
            },
            img({ node, ...props }: any) {
              return (
                <div className="my-4 overflow-hidden rounded-lg border-4 border-[#D68060] shadow-[4px_4px_0px_0px_#000]">
                  <img 
                    {...props} 
                    className="w-full h-auto object-cover transition-transform hover:scale-105 duration-300"
                    loading="lazy"
                    alt={props.alt || "Sri Lanka travel image"}
                  />
                  {props.alt && (
                    <div className="bg-[#1A3A5F] text-[#FFF5E1] py-2 px-3 text-sm font-medium">
                      {props.alt}
                    </div>
                  )}
                </div>
              );
            },
            a({ node, ...props }: any) {
              return (
                <a 
                  {...props} 
                  className="text-[#D68060] font-medium hover:text-[#FFF5E1] underline transition-colors duration-200"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {props.children}
                </a>
              );
            },
            ul({ node, ...props }: any) {
              return <ul className="list-disc pl-6 space-y-2" {...props} />;
            },
            ol({ node, ...props }: any) {
              return <ol className="list-decimal pl-6 space-y-2" {...props} />;
            },
            li({ node, ...props }: any) {
              return (
                <li className="marker:text-[#D68060] mb-3 pl-2 border-l-2 border-[#FFF5E1] py-1 text-[#FFF5E1]" {...props} />
              );
            },
            h1({ node, ...props }: any) {
              return (
                <h1 
                  {...props} 
                  className="text-3xl font-bold text-[#FFF5E1] border-b-4 border-[#D68060] pb-2 mb-6"
                />
              );
            },
            h2({ node, ...props }: any) {
              const content = props.children?.toString() || '';
              const isDayHeading = content.includes('Day');
              
              return (
                <div className="mt-8 mb-4">
                  <h2 
                    {...props} 
                    className={cn(
                      "text-2xl font-semibold flex items-center gap-2 p-3 rounded-t-lg",
                      isDayHeading ? "bg-[#FFF5E1] border-l-4 border-[#D68060] text-[#2A4858]" : "text-[#D68060]"
                    )}
                  />
                  {isDayHeading && <div className="h-1 bg-[#D68060] w-full opacity-30 rounded-b-lg mb-4"></div>}
                </div>
              );
            },
            h3({ node, ...props }: any) {
              const content = props.children?.toString() || '';
              const isTimeHeading = content.includes('Morning') || content.includes('Afternoon') || content.includes('Evening');
              
              return (
                <h3 
                  {...props} 
                  className={cn(
                    "text-xl font-medium mt-6 mb-3 flex items-center gap-2",
                    isTimeHeading ? "text-[#2A4858] bg-[#FFF5E1] p-2 rounded-lg border-l-4 border-[#D68060] font-bold" : "text-[#FFF5E1]"
                  )}
                />
              );
            },
            p({ node, ...props }: any) {
              const content = props.children?.toString() || '';
              
              // Check if paragraph contains cost information
              const hasCost = /(\$\d+|\d+ Rs\.)/.test(content);
              
              // Check if paragraph is about a place (contains location keywords)
              const isPlace = /(visit|located|explore|see|view|experience)/.test(content.toLowerCase());
              
              if (hasCost) {
                return (
                  <div className="my-3 p-3 bg-[#FFF5E1] rounded-lg border-l-4 border-[#D68060] flex items-center">
                    <DollarSignIcon className="text-[#D68060] mr-2 flex-shrink-0" size={18} />
                    <p {...props} className="m-0 text-[#1A3A5F]" />
                  </div>
                );
              } else if (isPlace && content.length > 50) {
                return (
                  <div className="my-3 p-3 bg-[#FFF5E1] rounded-lg border-l-4 border-[#1A3A5F] flex items-start">
                    <MapPinIcon className="text-[#1A3A5F] mr-2 mt-1 flex-shrink-0" size={18} />
                    <p {...props} className="m-0 text-[#1A3A5F]" />
                  </div>
                );
              }
              
              return <p {...props} className="my-2 text-[#FFF5E1]" />;
            },
          }}
        >
          {enhancedContent}
        </ReactMarkdown>
      )}
    </div>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  // Update the CodeHeader component to use the new color scheme
  return (
    <div className="flex items-center justify-between gap-4 rounded-t-lg bg-[#1A3A5F] px-4 py-2 text-sm font-semibold text-[#FFF5E1]">
      <span className="lowercase [&>span]:text-xs">{language}</span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && <CopyIcon className="text-[#FFF5E1]" />}
        {isCopied && <CheckIcon className="text-[#FFF5E1]" />}
      </TooltipIconButton>
    </div>
  );
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

