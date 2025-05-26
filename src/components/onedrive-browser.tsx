import React, { useState, useEffect } from 'react';
import { oneDriveAuthService, OneDriveItem, OneDriveImage } from '@/lib/onedrive-auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Folder, Image as ImageIcon, ChevronRight, User, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OneDriveBrowserProps {
  onImagesSelected: (images: OneDriveImage[]) => void;
}

export function OneDriveBrowser({ onImagesSelected }: OneDriveBrowserProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [folders, setFolders] = useState<OneDriveItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<OneDriveItem | null>(null);
  const [folderContents, setFolderContents] = useState<OneDriveItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<OneDriveItem[]>([]);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    setIsLoading(true);
    try {
      await oneDriveAuthService.initialize();
      const account = oneDriveAuthService.getActiveAccount();
      if (account && oneDriveAuthService.isLoggedIn()) {
        setIsAuthenticated(true);
        await loadUserInfo();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserInfo = async () => {
    try {
      const userInfo = await oneDriveAuthService.getCurrentUser();
      setUser(userInfo);
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const success = await oneDriveAuthService.login();
      if (success) {
        setIsAuthenticated(true);
        await loadUserInfo();
        await loadRootFolders();
        toast({
          title: "Success",
          description: "Successfully connected to OneDrive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to authenticate with OneDrive",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await oneDriveAuthService.logout();
      setIsAuthenticated(false);
      setUser(null);
      setFolders([]);
      setCurrentFolder(null);
      setFolderContents([]);
      setBreadcrumb([]);
      toast({
        title: "Success",
        description: "Successfully logged out from OneDrive",
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const loadRootFolders = async () => {
    setIsLoading(true);
    try {
      const rootFolders = await oneDriveAuthService.getRootFolders();
      setFolders(rootFolders);
    } catch (error) {
      console.error('Failed to load root folders:', error);
      toast({
        title: "Error",
        description: "Failed to load OneDrive folders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolderContents = async (folder: OneDriveItem) => {
    setIsLoading(true);
    try {
      const contents = await oneDriveAuthService.getFolderContents(folder.id);
      setCurrentFolder(folder);
      setFolderContents(contents);
      
      // Update breadcrumb
      if (breadcrumb.length === 0) {
        setBreadcrumb([folder]);
      } else {
        setBreadcrumb([...breadcrumb, folder]);
      }
    } catch (error) {
      console.error('Failed to load folder contents:', error);
      toast({
        title: "Error",
        description: "Failed to load folder contents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToFolder = (folder: OneDriveItem, index?: number) => {
    if (index !== undefined) {
      // Navigating through breadcrumb
      setBreadcrumb(breadcrumb.slice(0, index + 1));
    }
    loadFolderContents(folder);
  };

  const goBack = () => {
    if (breadcrumb.length > 1) {
      const newBreadcrumb = breadcrumb.slice(0, -1);
      setBreadcrumb(newBreadcrumb);
      const parentFolder = newBreadcrumb[newBreadcrumb.length - 1];
      loadFolderContents(parentFolder);
    } else if (breadcrumb.length === 1) {
      setBreadcrumb([]);
      setCurrentFolder(null);
      setFolderContents([]);
    }
  };

  const selectFolder = async (folder: OneDriveItem) => {
    setIsLoading(true);
    try {
      const images = await oneDriveAuthService.getImagesFromFolder(folder.id);
      if (images.length === 0) {
        toast({
          title: "No Images",
          description: "No images found in the selected folder",
          variant: "destructive",
        });
        return;
      }

      onImagesSelected(images);
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: `Loaded ${images.length} images from ${folder.name}`,
      });
    } catch (error) {
      console.error('Failed to load images from folder:', error);
      toast({
        title: "Error",
        description: "Failed to load images from the selected folder",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
    if (open && isAuthenticated && folders.length === 0) {
      loadRootFolders();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Connecting...' : 'Connect OneDrive'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user && (
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <User size={16} />
          <span>{user.displayName}</span>
        </div>
      )}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Folder size={16} className="mr-2" />
            Browse OneDrive
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Select OneDrive Folder</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBreadcrumb([]);
                    setCurrentFolder(null);
                    setFolderContents([]);
                  }}
                >
                  OneDrive
                </Button>
                {breadcrumb.map((folder, index) => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight size={16} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToFolder(folder, index)}
                    >
                      {folder.name}
                    </Button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Navigation */}
            {currentFolder && (
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={goBack}>
                  ← Back
                </Button>
                <Button onClick={() => selectFolder(currentFolder)}>
                  Select Current Folder ({currentFolder.name})
                </Button>
              </div>
            )}

            <Separator />

            {/* Folder Contents */}
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p>Loading...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {(currentFolder ? folderContents : folders)
                    .filter(item => item.folder) // Only show folders
                    .map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigateToFolder(folder)}
                      >
                        <Folder size={20} className="text-blue-600" />
                        <div className="flex-1">
                          <h3 className="font-medium">{folder.name}</h3>
                          {folder.folder && (
                            <p className="text-sm text-gray-500">
                              {folder.folder.childCount} items
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectFolder(folder);
                            }}
                          >
                            Select
                          </Button>
                          <ChevronRight size={16} className="text-gray-400" />
                        </div>
                      </div>
                    ))}
                  
                  {/* Show image files in current folder */}
                  {currentFolder && folderContents
                    .filter(item => item.file && item.file.mimeType?.startsWith('image/'))
                    .map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                      >
                        <ImageIcon size={20} className="text-green-600" />
                        <div className="flex-1">
                          <h3 className="font-medium">{file.name}</h3>
                          <p className="text-sm text-gray-500">
                            {file.file?.mimeType}
                          </p>
                        </div>
                      </div>
                    ))}

                  {(currentFolder ? folderContents : folders).length === 0 && !isLoading && (
                    <div className="text-center py-8 text-gray-500">
                      No folders found
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
