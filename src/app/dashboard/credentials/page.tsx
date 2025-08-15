"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

export default function CredentialsPage() {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch existing credentials
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAccessToken(data.instagramAccessToken || "");
          setBusinessAccountId(data.instagramBusinessAccountId || "");
        }
      } else {
        setUser(null);
        toast({
            title: "Not Authenticated",
            description: "You must be logged in to manage credentials.",
            variant: "destructive",
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save credentials.",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken || !businessAccountId) {
        toast({
            title: "Missing Fields",
            description: "Please fill out both fields.",
            variant: "destructive"
        });
        return;
    }


    setIsSaving(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
          instagramAccessToken: accessToken,
          instagramBusinessAccountId: businessAccountId,
      }, { merge: true }); // merge:true prevents overwriting other user data

      toast({
        title: "Credentials Saved",
        description: "Your Instagram API credentials have been saved.",
      });
    } catch (error) {
        console.error("Error saving credentials:", error);
        toast({
            title: "Save Failed",
            description: "Could not save credentials. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
          <KeyRound className="w-8 h-8" />
          API Credentials
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your Instagram API credentials here.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Instagram API Settings</CardTitle>
          <CardDescription>
            Enter your access token and Instagram Business Account ID.
          </CardDescription>
        </CardHeader>
        {isLoading ? (
            <CardContent>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        ) : (
            <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                    id="accessToken"
                    type="password"
                    placeholder="Enter your access token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    disabled={isSaving || !user}
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="businessAccountId">Instagram Business Account ID</Label>
                <Input
                    id="businessAccountId"
                    placeholder="Enter your Business Account ID"
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                    disabled={isSaving || !user}
                />
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={isSaving || !user}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Credentials
                </Button>
            </CardFooter>
            </form>
        )}
      </Card>
    </div>
  );
}
