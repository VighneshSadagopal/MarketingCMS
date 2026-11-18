"use client";

import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Send } from "lucide-react";
import { toast } from "sonner";

import { sendTestPush } from "@/app/(app)/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type State = "loading" | "unsupported" | "ios-install" | "not-configured" | "blocked" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Turns browser (push) notifications on or off for this browser/device. */
export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = isIos() && !isStandalone() ? "ios-install" : "unsupported";
      } else if (!vapidPublicKey) {
        next = "not-configured";
      } else if (Notification.permission === "denied") {
        next = "blocked";
      } else {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        next = sub ? "on" : "off";
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  function turnOn() {
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "blocked" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const { error } = await createClient().rpc("save_push_subscription", {
          p_endpoint: json.endpoint,
          p_p256dh: json.keys.p256dh,
          p_auth: json.keys.auth,
          p_user_agent: navigator.userAgent,
        });
        if (error) throw new Error(error.message);
        setState("on");
        toast.success("Browser notifications are on for this device.");
      } catch (e) {
        toast.error(`Couldn't turn on notifications: ${(e as Error).message}`);
      }
    });
  }

  function turnOff() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Browser notifications are off for this device.");
    });
  }

  function test() {
    startTransition(async () => {
      const r = await sendTestPush();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Browser notifications</h2>
        <p className="text-sm text-muted-foreground">
          Get a pop-up on this computer or phone when something needs you, even when the CMS isn&apos;t open. Turn it on
          separately on each device.
        </p>
        {state === "loading" ? <p className="text-sm text-muted-foreground">Checking this browser…</p> : null}
        {state === "unsupported" ? (
          <p className="text-sm font-semibold">
            This browser doesn&apos;t support notifications. Try Chrome, Edge or Firefox.
          </p>
        ) : null}
        {state === "ios-install" ? (
          <p className="text-sm font-semibold">
            On iPhone or iPad: tap Share, then <strong>Add to Home Screen</strong>, open the CMS from the Home Screen
            icon, and come back to this page to turn notifications on (iOS 16.4 or later).
          </p>
        ) : null}
        {state === "not-configured" ? (
          <p className="text-sm font-semibold">
            Browser notifications aren&apos;t set up on the server yet. The bell above still works.
          </p>
        ) : null}
        {state === "blocked" ? (
          <p className="text-sm font-semibold">
            Notifications are blocked for this site. Allow them in your browser&apos;s site settings (the icon left of
            the address bar), then reload this page.
          </p>
        ) : null}
        {state === "off" ? (
          <Button onClick={turnOn} disabled={pending} className="self-start">
            <BellRing strokeWidth={2.5} />
            Turn on for this device
          </Button>
        ) : null}
        {state === "on" ? (
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-2 text-sm font-bold text-blue-600">
              <BellRing className="size-4" strokeWidth={2.5} aria-hidden />
              On for this device
            </span>
            <Button variant="outline" size="sm" onClick={test} disabled={pending}>
              <Send strokeWidth={2.5} />
              Send me a test
            </Button>
            <Button variant="ghost" size="sm" onClick={turnOff} disabled={pending}>
              <BellOff strokeWidth={2.5} />
              Turn off
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
