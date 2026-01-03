import Link from "next/link";
import { getCommunityWidgets } from "@/lib/community/community";
import { getCommunityFeed, getCommunityStats } from "@/lib/community/feed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MessageSquare, 
  Megaphone, 
  FolderOpen, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default async function CommunityPage() {
  const [widgets, feed, stats] = await Promise.all([
    getCommunityWidgets(),
    getCommunityFeed(15),
    getCommunityStats(),
  ]);

  const quickLinks = [
    { 
      title: "Forums", 
      description: "Join discussions with other members",
      href: "/app/community/forums", 
      icon: MessageSquare,
      color: "bg-blue-500"
    },
    { 
      title: "Announcements", 
      description: "Stay updated with latest news",
      href: "/app/community/announcements", 
      icon: Megaphone,
      color: "bg-amber-500"
    },
    { 
      title: "Resources", 
      description: "Download templates and guides",
      href: "/app/community/resources", 
      icon: FolderOpen,
      color: "bg-green-500"
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm uppercase tracking-widest text-primary font-medium mb-2">
          The Inner Room
        </p>
        <h1 className="text-3xl font-bold">CEO Power Portal</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Where leaders stay sharp. Ongoing strategy, narrative refinement, and 
          tools for people building long-term power—not chasing trends.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.members}</p>
                <p className="text-sm text-muted-foreground">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.threads}</p>
                <p className="text-sm text-muted-foreground">Discussions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <Megaphone className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.announcements}</p>
                <p className="text-sm text-muted-foreground">Announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
              <CardHeader>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${link.color} text-white mb-2`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {link.title}
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* Community Widgets */}
      {widgets.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Community Spaces</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {widgets.map((w) => (
              <Link
                key={w.key}
                href={`/app/community/w/${w.key}`}
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted transition-colors"
              >
                <span className="text-2xl">{w.nav_icon ?? "📄"}</span>
                <span className="font-medium text-sm">{w.nav_label ?? w.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </h2>
        </div>
        <div className="space-y-3">
          {feed.map((item) => (
            <FeedCard key={`${item.type}-${item.id}`} item={item} />
          ))}
          {feed.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity yet. Be the first to start a discussion!</p>
                <Button asChild className="mt-4">
                  <Link href="/app/community/forums">Go to Forums</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function FeedCard({ item }: { item: any }) {
  const typeStyles = {
    announcement: { icon: "📢", bg: "bg-yellow-50", label: "Announcement" },
    thread: { icon: "💬", bg: "bg-blue-50", label: "Forum" },
    resource: { icon: "📁", bg: "bg-green-50", label: "Resource" },
  };

  const style = typeStyles[item.type as keyof typeof typeStyles];

  const href =
    item.type === "announcement"
      ? "/app/community/w/community-announcements"
      : item.type === "thread"
      ? `/app/community/w/community-forum/t/${item.id}`
      : "/app/community/w/community-resources";

  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 hover:shadow-sm transition-shadow ${style.bg}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-white/50">
              {style.label}
            </span>
            {item.is_pinned && (
              <span className="text-xs px-2 py-0.5 rounded bg-black text-white">
                Pinned
              </span>
            )}
            {item.category_name && (
              <span className="text-xs text-gray-600">{item.category_name}</span>
            )}
            {item.folder_name && (
              <span className="text-xs text-gray-600">{item.folder_name}</span>
            )}
          </div>
          <div className="font-medium mt-1">{item.title}</div>
          {item.preview && (
            <div className="text-sm text-gray-600 mt-1 line-clamp-2">
              {item.preview}
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            {new Date(item.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Link>
  );
}
