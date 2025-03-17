import { useStreamContext } from "@/providers/Stream";
import { Message } from "@langchain/langgraph-sdk";
import { useState } from "react";
import { getContentString } from "../utils";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { BranchSwitcher, CommandBar } from "./shared";

function EditableContent({
  value,
  setValue,
  onSubmit,
}: {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <Textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className="focus-visible:ring-0"
    />
  );
}

interface HumanMessageProps {
  message: Message;
  isLoading?: boolean;
  className?: string;
}

export function HumanMessage(props: HumanMessageProps) {
  const thread = useStreamContext();
  const meta = thread.getMessagesMetadata(props.message);
  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;
  const contentString = getContentString(props.message.content);

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(contentString);

  const handleSubmitEdit = () => {
    setIsEditing(false);

    const newMessage: Message = { type: "human", content: value };
    thread.submit(
      { messages: [newMessage] },
      {
        checkpoint: parentCheckpoint,
        streamMode: ["values"],
        optimisticValues: (prev) => {
          const values = meta?.firstSeenState?.values;
          if (!values) return prev;

          return {
            ...values,
            messages: [...(values.messages ?? []), newMessage],
          };
        },
      },
    );
  };

  if (!props.isLoading && props.className) {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 self-end max-w-[80%]",
          props.className
        )}
      >
        <div className="bg-[#006A4E] text-[#FFF5E1] p-4 rounded-tl-lg rounded-tr-lg rounded-bl-none rounded-br-lg border-4 border-[#D2691E] shadow-[4px_4px_0px_0px_#000]">
          <div className="whitespace-pre-wrap font-medium">
            {getContentString(props.message.content)}
          </div>
        </div>
        <div className="text-xs text-[#006A4E] font-bold self-end mr-2">YOU</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center ml-auto gap-2 group",
        isEditing && "w-full max-w-xl",
      )}
    >
      <div className={cn("flex flex-col gap-2", isEditing && "w-full")}>
        {isEditing ? (
          <EditableContent
            value={value}
            setValue={setValue}
            onSubmit={handleSubmitEdit}
          />
        ) : (
          <p className="text-right px-4 py-2 rounded-3xl bg-muted">
            {contentString}
          </p>
        )}

        <div
          className={cn(
            "flex gap-2 items-center ml-auto transition-opacity",
            "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
            isEditing && "opacity-100",
          )}
        >
          <BranchSwitcher
            branch={meta?.branch}
            branchOptions={meta?.branchOptions}
            onSelect={(branch) => thread.setBranch(branch)}
            isLoading={!!props.isLoading}
          />
          <CommandBar
            isLoading={!!props.isLoading}
            content={contentString}
            isEditing={isEditing}
            setIsEditing={(c) => {
              if (c) {
                setValue(contentString);
              }
              setIsEditing(c);
            }}
            handleSubmitEdit={handleSubmitEdit}
            isHumanMessage={true}
          />
        </div>
      </div>
    </div>
  );
}
