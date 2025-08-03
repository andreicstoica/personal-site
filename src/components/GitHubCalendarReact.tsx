import { useEffect, useState } from "react";

interface Props {
  username: string;
  monthsBack?: number;
}

interface ContributionData {
  date: string;
  count: number;
  level: number;
}

export default function GitHubCalendarReact({
  username,
  monthsBack = 3,
}: Props) {
  const [GitHubCalendar, setGitHubCalendar] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [contributionData, setContributionData] = useState<ContributionData[]>(
    []
  );
  const [yearlyTotal, setYearlyTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);

    // Dynamically import the component on the client side
    import("react-github-calendar").then((module) => {
      setGitHubCalendar(() => module.default);
    });

    // Fetch GitHub contribution data
    const fetchContributions = async () => {
      try {
        const response = await fetch(
          `https://github-contributions-api.jogruber.de/v4/${username}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Calculate exact date range for N months back
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999); // End of today

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);
        startDate.setHours(0, 0, 0, 0); // Start of the day

        // Filter to only show data within our exact date range
        const filteredData = data.contributions.filter((contribution: any) => {
          const contributionDate = new Date(contribution.date);
          return contributionDate >= startDate && contributionDate <= endDate;
        });

        // Ensure we have data for all dates in the range (even if 0 contributions)
        const allDates = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dateString = currentDate.toISOString().split("T")[0];
          const existingData = filteredData.find(
            (d: ContributionData) => d.date === dateString
          );

          if (existingData) {
            allDates.push(existingData);
          } else {
            allDates.push({
              date: dateString,
              count: 0,
              level: 0,
            });
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate yearly total from the total field
        const currentYear = new Date().getFullYear();
        const yearlyTotal = data.total[currentYear] || 0;

        setContributionData(allDates);
        setYearlyTotal(yearlyTotal);
      } catch (error) {
        console.error("Error fetching GitHub contributions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContributions();
  }, [username, monthsBack]);

  const getTimeRangeText = () => {
    if (monthsBack === 1) return "Last Month";
    if (monthsBack === 3) return "Last 3 Months";
    if (monthsBack === 6) return "Last 6 Months";
    if (monthsBack === 12) return "Last Year";
    return `Last ${monthsBack} Months`;
  };

  if (!isClient || !GitHubCalendar || isLoading) {
    return (
      <div className="github-calendar-wrapper">
        <h2 className="text-xl font-medium mb-3 text-[--color-text-primary]">
          GitHub Contributions ({getTimeRangeText()})
        </h2>
        <div className="calendar">
          <div className="loading-placeholder">
            Loading GitHub contributions...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="github-calendar-wrapper">
      <h2 className="text-xl font-medium mb-3 text-[--color-text-primary]">
        GitHub Contributions
      </h2>
      <div className="calendar">
        <GitHubCalendar
          data={contributionData}
          blockSize={12}
          blockMargin={4}
          fontSize={14}
          colorScheme="light"
          hideTotalCount={true}
          hideColorLegend={true}
        />
      </div>
      <div className="text-sm text-[--color-text-secondary] mt-2">
        {yearlyTotal} contributions in the last year
      </div>
    </div>
  );
}
