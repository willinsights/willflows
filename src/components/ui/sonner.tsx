import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/80 group-[.toaster]:dark:bg-background/70 group-[.toaster]:backdrop-blur-xl group-[.toaster]:backdrop-saturate-150 group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-xl group-[.toaster]:shadow-black/10 group-[.toaster]:dark:shadow-black/30",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80",
          success:
            "group-[.toaster]:!bg-success/10 group-[.toaster]:dark:!bg-success/20 group-[.toaster]:!backdrop-blur-xl group-[.toaster]:!border-success/30 group-[.toaster]:!text-success-foreground group-[.toaster]:dark:!text-success",
          error:
            "group-[.toaster]:!bg-destructive/10 group-[.toaster]:dark:!bg-destructive/20 group-[.toaster]:!backdrop-blur-xl group-[.toaster]:!border-destructive/30 group-[.toaster]:!text-destructive",
          warning:
            "group-[.toaster]:!bg-warning/10 group-[.toaster]:dark:!bg-warning/20 group-[.toaster]:!backdrop-blur-xl group-[.toaster]:!border-warning/30 group-[.toaster]:!text-warning",
          info:
            "group-[.toaster]:!bg-primary/10 group-[.toaster]:dark:!bg-primary/20 group-[.toaster]:!backdrop-blur-xl group-[.toaster]:!border-primary/30 group-[.toaster]:!text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
