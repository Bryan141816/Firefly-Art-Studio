import { useEffect, useRef } from "react";

export type InfiniteCanvasContextMenu = {
    show: boolean;
    x: number;
    y: number;
};

type InfiniteCanvasContextMenuComponent = {
    contextMenu: InfiniteCanvasContextMenu;
    setContextMenu: React.Dispatch<
        React.SetStateAction<InfiniteCanvasContextMenu>
    >;
    onDelete: (id: string) => void;
};

export default function InfiniteCanvasContextMenuComponent({
    contextMenu,
    setContextMenu,
}: InfiniteCanvasContextMenuComponent) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!contextMenu.show) return;

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;

            if (
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setContextMenu((prev) => ({
                    ...prev,
                    show: false,
                }));
            }
        };

        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [contextMenu.show, setContextMenu]);

    if (!contextMenu.show) return null;

    return (
        <div
            ref={menuRef}
            className="
                z-50
                max-h-[var(--available-height)]
                min-w-36
                overflow-x-hidden
                overflow-y-auto
                rounded-lg
                bg-popover
                p-1
                text-popover-foreground
                shadow-md
                ring-1
                ring-foreground/10
            "
            style={{
                position: "fixed",
                top: contextMenu.y,
                left: contextMenu.x,
            }}
        >
            <button
                className="
                    group/context-menu-item
                    relative
                    flex
                    w-full
                    cursor-default
                    items-center
                    gap-1.5
                    rounded-md
                    px-1.5
                    py-1
                    text-sm
                    outline-hidden
                    select-none
                    focus:bg-accent
                    focus:text-accent-foreground
                    hover:bg-accent
                    hover:text-accent-foreground
                "
                onClick={() => {
                    setContextMenu((prev) => ({
                        ...prev,
                        show: false,
                    }));
                }}
            >
                Duplicate
            </button>

            <button
                className="
                    group/context-menu-item
                    relative
                    flex
                    w-full
                    cursor-default
                    items-center
                    gap-1.5
                    rounded-md
                    px-1.5
                    py-1
                    text-sm
                    outline-hidden
                    select-none
                    text-destructive
                    hover:bg-destructive/10
                    hover:text-destructive
                "
                onClick={() => {
                    // Delete logic
                }}
            >
                Delete
            </button>
        </div>
    );
}