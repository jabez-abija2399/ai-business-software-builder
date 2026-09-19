"use client";

import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={session?.user?.name || ""}
                disabled
                className="w-full px-3 py-2 border rounded-md bg-muted text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="w-full px-3 py-2 border rounded-md bg-muted text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Theme</label>
              <select className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" defaultChecked />
              <span className="text-sm">Email notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" defaultChecked />
              <span className="text-sm">Build status updates</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Marketing emails</span>
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border rounded-lg p-6 border-red-200">
          <h2 className="font-semibold mb-4 text-red-600">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These actions are irreversible.
          </p>
          <button className="bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
