import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_TITLES: Record<string, string> = {
  home: "Tamaki Makaurau RP",
  team: "Meet the Team | Tamaki Makaurau RP",
  join: "Join Us | Tamaki Makaurau RP",
  support: "Support | Tamaki Makaurau RP",
  departments: "Departments | Tamaki Makaurau RP",
};

const DEFAULT_DESCRIPTION = "New Zealand's premier GTA V FiveM roleplay server set in Auckland.";

export function PageSeo({ page }: { page: string }) {
  const { data } = useQuery({
    queryKey: ["seo", page],
    queryFn: async () => {
      const res = await fetch(`/api/seo/${page}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ title: string | null; description: string | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const title = data?.title || DEFAULT_TITLES[page] || "Tamaki Makaurau RP";
    document.title = title;

    const description = data?.description || DEFAULT_DESCRIPTION;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", description);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", title);

    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute("content", description);
  }, [data, page]);

  return null;
}
