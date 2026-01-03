import { redirect, notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getWidgetByKey, canAccessCommunityWidget } from "@/lib/community/community";
import ForumApp from "@/components/community/ForumApp";
import AnnouncementsApp from "@/components/community/AnnouncementsApp";
import ResourcesApp from "@/components/community/ResourcesApp";
import ChatApp from "@/components/community/ChatApp";
import WidgetPaywall from "@/components/community/WidgetPaywall";

export default async function CommunityWidgetPage({
  params,
}: {
  params: { widgetKey: string };
}) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect(`/login?next=/app/community/w/${params.widgetKey}`);
  }

  const widget = await getWidgetByKey(params.widgetKey);
  if (!widget) notFound();

  const allowed = await canAccessCommunityWidget(auth.user.id, widget);

  if (!allowed) {
    return <WidgetPaywall widget={widget} />;
  }

  if (widget.widget_kind === "forum") {
    return <ForumApp widget={widget} />;
  }

  if (widget.widget_kind === "announcements") {
    return <AnnouncementsApp widget={widget} />;
  }

  if (widget.widget_kind === "resources") {
    return <ResourcesApp widget={widget} />;
  }

  if (widget.widget_kind === "chat") {
    return <ChatApp widget={widget} />;
  }

  return <div>Unknown widget kind: {widget.widget_kind}</div>;
}
