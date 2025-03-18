import { parsePartialJson } from "@langchain/core/output_parsers";
import { useStreamContext } from "@/providers/Stream";
import { AIMessage, Checkpoint, Message } from "@langchain/langgraph-sdk";
import { getContentString } from "../utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "../markdown-text";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { cn } from "@/lib/utils";
import { ToolCalls, ToolResult } from "./tool-calls";
import { MessageContentComplex } from "@langchain/core/messages";
import { Fragment } from "react/jsx-runtime";
import { isAgentInboxInterruptSchema } from "@/lib/agent-inbox-interrupt";
import { ThreadView } from "../agent-inbox";
import { BooleanParam, useQueryParam } from "use-query-params";
import { CopyIcon, RefreshCcw, CheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { TooltipIconButton } from "../tooltip-icon-button";

function CustomComponent({   
  message,
  thread,
}: {
  message: Message;
  thread: ReturnType<typeof useStreamContext>;
}) {
  const { values } = useStreamContext();
  const customComponents = values.ui?.filter(
    (ui) => ui.metadata?.message_id === message.id,
  );

  if (!customComponents?.length) return null;
  return (
    <Fragment key={message.id}>
      {customComponents.map((customComponent) => (
        <LoadExternalComponent
          key={customComponent.id}
          stream={thread}
          message={customComponent}
          meta={{ ui: customComponent }}
        />
      ))}
    </Fragment>
  );
}

function parseAnthropicStreamedToolCalls(
  content: MessageContentComplex[],
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter((c) => c.type === "tool_use" && c.id);

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, any>;
    let json: Record<string, any> = {};
    if (toolCall?.input) {
      try {
        json = parsePartialJson(toolCall.input) ?? {};
      } catch {
        // Pass
      }
    }
    return {
      name: toolCall.name ?? "",
      id: toolCall.id ?? "",
      args: json,
      type: "tool_call",
    };
  });
}

export function AssistantMessage({
  message,
  isLoading,
  handleRegenerate,
}: {
  message: Message;
  isLoading: boolean;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    if (typeof message.content === "string") {
      navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  const contentString = getContentString(message.content);
  const [hideToolCalls] = useQueryParam("hideToolCalls", BooleanParam);

  const thread = useStreamContext();
  // Use type assertion to access response_metadata safely
  const response_metadata = (message as any).response_metadata || {};
  
  // Example: Skip rendering if message is marked as hidden
  if (response_metadata.hide) {
    return null;
  }
  const isLastMessage = thread.messages[thread.messages.length - 1].id === message.id;
  const meta = thread.getMessagesMetadata(message);
  const interrupt = thread.interrupt;
  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;
  const anthropicStreamedToolCalls = Array.isArray(message.content)
    ? parseAnthropicStreamedToolCalls(message.content)
    : undefined;

  const hasToolCalls =
    "tool_calls" in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;
  const toolCallsHaveContents =
    hasToolCalls &&
    message.tool_calls?.some(
      (tc) => tc.args && Object.keys(tc.args).length > 0,
    );
  const hasAnthropicToolCalls = !!anthropicStreamedToolCalls?.length;
  const isToolResult = message.type === "tool";

  if (isToolResult && hideToolCalls) {
    return null;
  }

  return (
    <div className="flex items-start mr-auto gap-2 max-w-[85%]">
      {isToolResult ? (
        <ToolResult message={message} />
      ) : (
        <div className="flex flex-col gap-2">
          {contentString.length > 0 && (
            <div className="py-1 px-4 bg-[#D2691E] text-[#FFF5E1] rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none border-4 border-[#D2691E] shadow-[4px_4px_0px_0px_#000]">
              <div className="prose prose-invert max-w-none">
                <MarkdownText>{contentString}</MarkdownText>
              </div>
            </div>
          )}

          {!hideToolCalls && (
            <>
              {(hasToolCalls && toolCallsHaveContents && (
                <ToolCalls toolCalls={message.tool_calls} />
              )) ||
                (hasAnthropicToolCalls && (
                  <ToolCalls toolCalls={anthropicStreamedToolCalls} />
                )) ||
                (hasToolCalls && <ToolCalls toolCalls={message.tool_calls} />)}
            </>
          )}

          <CustomComponent message={message} thread={thread} />
          {isAgentInboxInterruptSchema(interrupt?.value) && isLastMessage && (
            <ThreadView interrupt={interrupt.value[0]} />
          )}
          
          {/* Add explicit action buttons that are always visible */}
          <div className="flex items-center gap-2 mt-1">
            <TooltipIconButton
              tooltip="Copy content"
              onClick={copyToClipboard}
              className="text-[#006A4E] hover:text-[#D2691E] transition-colors border-2 border-[#D2691E] bg-[#FFF5E1]"
              variant="ghost"
              size="sm"
            >
              {isCopied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            </TooltipIconButton>
            
            <TooltipIconButton
              tooltip="Regenerate response"
              onClick={() => handleRegenerate(parentCheckpoint)}
              className="text-[#006A4E] hover:text-[#D2691E] transition-colors border-2 border-[#D2691E] bg-[#FFF5E1]"
              variant="ghost"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCcw className="size-4" />
            </TooltipIconButton>
          </div>
          
          {/* Keep the original CommandBar for backward compatibility */}
          <div
            className={cn(
              "flex gap-2 items-center mr-auto transition-opacity",
              "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
            )}
          >
            <BranchSwitcher
              branch={meta?.branch}
              branchOptions={meta?.branchOptions}
              onSelect={(branch) => thread.setBranch(branch)}
              isLoading={isLoading}
            />
            <CommandBar
              content={contentString}
              isLoading={isLoading}
              isAiMessage={true}
              handleRegenerate={() => handleRegenerate(parentCheckpoint)}
            />
          </div>
          <div className="text-xs text-[#006A4E] font-bold ml-2">HIBOWAN</div>
        </div>
      )}
    </div>
  );
}

export function AssistantMessageLoading() {
  return (
    <div className="flex items-start mr-auto gap-2">
      <div className="flex items-center gap-1 rounded-lg bg-[#006A4E]/70 px-4 py-2 h-8 border-2 border-[#D2691E]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFF5E1] animate-[pulse_1.5s_ease-in-out_infinite]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFF5E1] animate-[pulse_1.5s_ease-in-out_0.5s_infinite]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFF5E1] animate-[pulse_1.5s_ease-in-out_1s_infinite]"></div>
      </div>
    </div>
  );
}
