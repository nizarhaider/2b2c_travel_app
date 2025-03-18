import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { useState, FormEvent } from "react";
import { Button } from "../ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  ArrowDown,
  LoaderCircle,
  PanelRightOpen,
  PanelRightClose,
  SquarePen,
} from "lucide-react";
import { BooleanParam, StringParam, useQueryParam } from "use-query-params";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
// Add this import at the top of the file
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Sri Lankan-inspired logo component with multilingual support
function HiBowanLogo({ width = 32, height = 32, className, isHeader = false }: {
  width?: number;
  height?: number;
  className?: string;
  isHeader?: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("relative flex items-center justify-center cursor-pointer", className)}>
            {isHeader && (
              <motion.img 
                src="/logo.svg" 
                alt="Sri Lankan mask logo" 
                width={width} 
                height={height}
                className="object-contain"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            )}
            <span className="ml-2 text-xl font-bold tracking-tight font-display text-[#006A4E]">Hiබෝවන්!</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-[#FFF5E1] border-2 border-[#D2691E] text-[#006A4E] font-bold">
          வணக்கம் - Hello
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div ref={context.contentRef} className={props.contentClassName}>
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={cn("brutalist-button border-4 border-primary font-bold", props.className)}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="w-4 h-4 mr-2" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

export function Thread() {
  // Existing state and hooks
  const [threadId, setThreadId] = useQueryParam("threadId", StringParam);
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryParam(
    "chatHistoryOpen",
    BooleanParam,
  );
  const [hideToolCalls, setHideToolCalls] = useQueryParam(
    "hideToolCalls",
    BooleanParam,
  );
  const [input, setInput] = useState("");
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  // Add this new state to control welcome popup visibility
  const [showWelcomePopup, setShowWelcomePopup] = useState(true);

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const lastError = useRef<string | undefined>(undefined);

  // Error handling
  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        return;
      }

      lastError.current = message;
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  // Message handling
  const prevMessageLength = useRef(0);
  useEffect(() => {
    if (
      messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages[messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setFirstTokenReceived(false);

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: input,
    };

    const toolMessages = ensureToolCallsHaveResponses(stream.messages);
    stream.submit(
      { messages: [...toolMessages, newHumanMessage] },
      {
        streamMode: ["values"],
        optimisticValues: (prev) => ({
          ...prev,
          messages: [
            ...(prev.messages ?? []),
            ...toolMessages,
            newHumanMessage,
          ],
        }),
      },
    );

    setInput("");
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["debug"],
    });
  };

  const chatStarted = !!threadId || !!messages.length;

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#FFF5E1] sri-lankan-pattern">
      {/* Sidebar */}
      <div className="relative lg:flex hidden">
        <motion.div
          className="absolute h-full border-r-4 border-[#D2691E] bg-[#FFF5E1] overflow-hidden z-20"
          style={{ width: 300 }}
          animate={
            isLargeScreen
              ? { x: chatHistoryOpen ? 0 : -300 }
              : { x: chatHistoryOpen ? 0 : -300 }
          }
          initial={{ x: -300 }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div className="relative h-full" style={{ width: 300 }}>
            {/* <div className="p-4 border-b-4 border-[#D2691E] flex items-center justify-center">
              <h2 className="text-2xl font-bold font-display text-[#006A4E]">Chat History</h2>
            </div> */}
            {/* Replace Chat History with Thread History */}
            <ThreadHistory />
            
            {/* Main chat area */}
            <div className="flex flex-col flex-1 h-full overflow-hidden">
              {/* ... rest of your chat UI ... */}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main content */}
      <motion.div
        className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden relative",
          !chatStarted && "grid-rows-[1fr]",
        )}
        layout={isLargeScreen}
        animate={{
          marginLeft: chatHistoryOpen ? (isLargeScreen ? 300 : 0) : 0,
          width: chatHistoryOpen
            ? isLargeScreen
              ? "calc(100% - 300px)"
              : "100%"
            : "100%",
        }}
        transition={
          isLargeScreen
            ? { type: "spring", stiffness: 300, damping: 30 }
            : { duration: 0 }
        }
      >
        {/* Header for empty state */}
        {!chatStarted && (
          <div className="absolute top-0 left-0 w-full flex items-center justify-between gap-3 p-2 pl-4 z-10">
            {(!chatHistoryOpen || !isLargeScreen) && (
              <Button
                className="hover:bg-[#D2691E]/20 border-2 border-[#D2691E] text-[#006A4E] font-bold"
                variant="ghost"
                onClick={() => setChatHistoryOpen((p) => !p)}
              >
                {chatHistoryOpen ? (
                  <PanelRightOpen className="size-5" />
                ) : (
                  <PanelRightClose className="size-5" />
                )}
              </Button>
            )}
          </div>
        )}

        {/* Header for chat started */}
        {chatStarted && (
          <div className="flex items-center justify-between gap-3 p-2 pl-4 z-10 relative border-b-4 border-[#D2691E] bg-[#FFF5E1]">
            <div className="flex items-center justify-start gap-2 relative">
              <div className="absolute left-0 z-10">
                {(!chatHistoryOpen || !isLargeScreen) && (
                  <Button
                    className="hover:bg-[#D2691E]/20 border-2 border-[#D2691E] text-[#006A4E] font-bold"
                    variant="ghost"
                    onClick={() => setChatHistoryOpen((p) => !p)}
                  >
                    {chatHistoryOpen ? (
                      <PanelRightOpen className="size-5" />
                    ) : (
                      <PanelRightClose className="size-5" />
                    )}
                  </Button>
                )}
              </div>
              <motion.button
                className="flex items-center cursor-pointer"
                onClick={() => setThreadId(null)}
                style={{ 
                  marginLeft: chatHistoryOpen ? '16px' : '56px',
                  paddingLeft: '8px'
                }}
                animate={{
                  marginLeft: !chatHistoryOpen ? 56 : 16,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                <HiBowanLogo width={40} height={40} isHeader={true} />
              </motion.button>
            </div>

            <TooltipIconButton
              size="lg"
              className="p-4 border-2 border-[#D2691E] text-[#006A4E] font-bold"
              tooltip="New thread"
              variant="ghost"
              onClick={() => setThreadId(null)}
            >
              <SquarePen className="size-5" />
            </TooltipIconButton>

            <div className="absolute inset-x-0 top-full h-5 bg-gradient-to-b from-[#FFF5E1] to-[#FFF5E1]/0" />
          </div>
        )}

        {/* Chat content */}
        <StickToBottom className="relative flex-1 overflow-hidden">
          <StickyToBottomContent
            className={cn(
              "absolute inset-0 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:bg-[#D2691E] [&::-webkit-scrollbar-track]:bg-[#FFF5E1]",
              !chatStarted && "flex flex-col items-stretch mt-[25vh]",
              chatStarted && "grid grid-rows-[1fr_auto]",
            )}
            contentClassName="pt-8 pb-16 max-w-3xl mx-auto flex flex-col gap-4 w-full"
            content={
              <>
                {messages
                  .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                  .map((message, index) =>
                    message.type === "human" ? (
                      <HumanMessage
                        key={message.id || `${message.type}-${index}`}
                        message={message}
                        isLoading={isLoading}
                      />
                    ) : (
                      <AssistantMessage
                        key={message.id || `${message.type}-${index}`}
                        message={message}
                        isLoading={isLoading}
                        handleRegenerate={handleRegenerate}
                      />
                    ),
                  )}
                {isLoading && !firstTokenReceived && (
                  <AssistantMessageLoading />
                )}
              </>
            }
            footer={
              <div className="sticky flex flex-col items-center gap-8 bottom-0 px-4 bg-[#FFF5E1]">
                {!chatStarted && (
                  <div className="flex gap-3 items-center justify-center py-6 mb-4">
                    <HiBowanLogo className="flex-shrink-0" width={48} height={48} isHeader={false} />
                  </div>
                )}

                <ScrollToBottom className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 animate-in fade-in-0 zoom-in-95" />

                <div className="bg-[#FFF5E1] rounded-none border-4 border-[#D2691E] shadow-[8px_8px_0px_0px_#006A4E] mx-auto mb-8 w-full max-w-3xl relative z-10">
                  <form
                    onSubmit={handleSubmit}
                    className="grid grid-rows-[1fr_auto] gap-2 max-w-3xl mx-auto"
                  >
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
                          e.preventDefault();
                          const el = e.target as HTMLElement | undefined;
                          const form = el?.closest("form");
                          form?.requestSubmit();
                        }
                      }}
                      placeholder="Ask about Sri Lankan destinations..."
                      className="min-h-[60px] w-full resize-none bg-[#FFF5E1] p-3 text-[#333] font-medium focus:outline-none focus:ring-0 placeholder:text-[#006A4E]/50 font-sans"
                    />
                    <div className="flex items-center justify-between p-2 border-t-4 border-[#D2691E]">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor="hideToolCalls"
                          className="text-[#006A4E] font-bold cursor-pointer"
                        >
                          Hide tool calls
                        </Label>
                        <Switch
                          id="hideToolCalls"
                          checked={!!hideToolCalls}
                          onCheckedChange={setHideToolCalls}
                          className="data-[state=checked]:bg-[#006A4E] border-2 border-[#D2691E]"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-[#D2691E] hover:bg-[#D2691E]/90 text-[#FFF5E1] font-bold border-2 border-[#006A4E] px-6 py-2 text-lg shadow-[4px_4px_0px_0px_#006A4E] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#D2691E] transition-all"
                      >
                        {isLoading ? (
                          <LoaderCircle className="size-5 animate-spin" />
                        ) : (
                          "Send"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            }
          />
        </StickToBottom>

        {/* Welcome screen */}
        {!chatStarted && showWelcomePopup && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-0">
            <div className="max-w-2xl w-full bg-[#FFF5E1] border-4 border-[#D2691E] shadow-[12px_12px_0px_0px_#006A4E] p-8 mb-8 relative">
              {/* Close button */}
              <button 
                onClick={() => setShowWelcomePopup(false)}
                className="absolute top-4 right-4 text-[#006A4E] hover:text-[#D2691E] transition-colors w-8 h-8 rounded-full border-2 border-[#D2691E] flex items-center justify-center hover:bg-[#FFF5E1]/80 hover:border-[#006A4E] transition-all duration-200"
                aria-label="Close welcome popup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1 className="text-4xl font-bold mb-6 text-[#D2691E] font-display text-center cursor-pointer">
                    Hiබෝවන්!
                    </h1>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#FFF5E1] border-2 border-[#D2691E] text-[#006A4E] font-bold">
                    வணக்கம் - Hello
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <p className="text-xl mb-6 text-[#333] font-medium">
                Your Sri Lankan travel companion. Ask me about:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Button 
                  onClick={() => {
                    setInput("Tell me about beautiful beaches and coastal areas in Sri Lanka");
                    setShowWelcomePopup(false);
                  }}
                  className="bg-[#FFF5E1] text-[#006A4E] border-4 border-[#006A4E] font-bold p-4 h-auto text-left hover:bg-[#006A4E]/10 shadow-[4px_4px_0px_0px_#D2691E] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#D2691E] transition-all"
                >
                  🏝️ Beautiful beaches and coastal areas
                </Button>
                <Button 
                  onClick={() => {
                    setInput("What are the must-visit cultural sites in Sri Lanka?");
                    setShowWelcomePopup(false); // Add this line
                    setTimeout(() => {
                      const textarea = document.querySelector("textarea");
                      if (textarea) textarea.focus();
                    }, 100);
                  }}
                  className="bg-[#FFF5E1] text-[#006A4E] border-4 border-[#006A4E] font-bold p-4 h-auto text-left hover:bg-[#006A4E]/10 shadow-[4px_4px_0px_0px_#D2691E] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#D2691E] transition-all"
                >
                  🏛️ Cultural heritage sites and temples
                </Button>
                <Button 
                  onClick={() => {
                    setInput("What's the best time to visit Sri Lanka?");
                    setShowWelcomePopup(false); // Add this line
                    setTimeout(() => {
                      const textarea = document.querySelector("textarea");
                      if (textarea) textarea.focus();
                    }, 100);
                  }}
                  className="bg-[#FFF5E1] text-[#006A4E] border-4 border-[#006A4E] font-bold p-4 h-auto text-left hover:bg-[#006A4E]/10 shadow-[4px_4px_0px_0px_#D2691E] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#D2691E] transition-all"
                >
                  🌦️ Weather and best times to visit
                </Button>
                <Button 
                  onClick={() => {
                    setInput("What are some traditional Sri Lankan dishes I should try?");
                    setShowWelcomePopup(false); // Add this line
                    setTimeout(() => {
                      const textarea = document.querySelector("textarea");
                      if (textarea) textarea.focus();
                    }, 100);
                  }}
                  className="bg-[#FFF5E1] text-[#006A4E] border-4 border-[#006A4E] font-bold p-4 h-auto text-left hover:bg-[#006A4E]/10 shadow-[4px_4px_0px_0px_#D2691E] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#D2691E] transition-all"
                >
                  🍛 Local cuisine and culinary experiences
                </Button>
              </div>
              <div className="border-t-4 border-[#D2691E] pt-4 mt-4">
                <p className="text-center text-[#006A4E] font-medium">
                  Type your question below or select a suggestion to get started
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
