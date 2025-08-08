"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

export default function CredentialsPage() {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would securely save the credentials.
    toast({
      title: "Credentials Saved",
      description: "Your Meta API credentials have been saved.",
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <KeyRound className="w-8 h-8" />
          API Credentials
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your Meta API credentials here.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Meta API Settings</CardTitle>
          <CardDescription>
            Enter your access token and other details to connect your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="accessToken">Access Token</Label>
              <Input id="accessToken" type="password" placeholder="Enter your access token" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageId">Page ID</Label>
              <Input id="pageId" placeholder="Enter your Page ID" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="adAccountId">Ad Account ID</Label>
              <Input id="adAccountId" placeholder="Enter your Ad Account ID" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Save Credentials</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
