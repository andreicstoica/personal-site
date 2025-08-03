declare module "github-calendar" {
    interface GitHubCalendarOptions {
        responsive?: boolean;
        tooltips?: boolean;
        global_stats?: boolean;
        summary_text?: string;
        cache?: number;
        proxy?: (username: string) => string;
    }

    function GitHubCalendar(
        element: string | HTMLElement,
        username: string,
        options?: GitHubCalendarOptions,
    ): Promise<void>;

    export = GitHubCalendar;
}

declare module "github-calendar/dist/github-calendar-responsive.css" {
    const content: any;
    export default content;
} 