import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, ShoppingCart, Users, Settings, Trash2, Edit, FileText } from "lucide-react";
import { Link } from "wouter";
import { PackageCard } from "@/components/admin/PackageCard";
import { PackageForm } from "@/components/admin/PackageForm";
import { ProductForm } from "@/components/admin/ProductForm";
import type { PackageWithTiers } from "@shared/schema";
// import { PackageManager } from "@/components/admin/PackageManager";
// import { ProductManager } from "@/components/admin/ProductManager";
// import { UserManager } from "@/components/admin/UserManager";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'package' | 'product' | 'user';
    item: any;
  }>({ open: false, type: 'package', item: null });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: 'package' | 'product' | 'user';
    item: any;
  }>({ open: false, type: 'package', item: null });

  const [packageFormOpen, setPackageFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageWithTiers | undefined>(undefined);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(undefined);

  const [editForm, setEditForm] = useState<any>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();



  // Fetch admin overview data - disable React Query and use direct fetch since auth works
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<{
    packageCount: number;
    productCount: number;
    userCount: number;
    activeSubscriptions: number;
  }>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats', { 
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
    retry: false,
  });

  const { data: packages, isLoading: packagesLoading, error: packagesError } = useQuery({
    queryKey: ["/api/admin/packages"],
    queryFn: async () => {
      const res = await fetch('/api/admin/packages', { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    retry: false,
  });

  const { data: products, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch('/api/admin/products', { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    retry: false,
  });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch('/api/admin/users', { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    retry: false,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const response = await fetch(`/api/admin/${type}s/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      return response.json();
    },
    onSuccess: (_, { type }) => {
      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
      });
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${type}s`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteDialog({ open: false, type: 'package', item: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (type: 'package' | 'product' | 'user', item: any) => {
    setDeleteDialog({ open: true, type, item });
  };

  const confirmDelete = () => {
    if (deleteDialog.item) {
      deleteMutation.mutate({
        type: deleteDialog.type,
        id: deleteDialog.item.id,
      });
    }
  };

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ type, id, data }: { type: string; id: string; data: any }) => {
      const response = await fetch(`/api/admin/${type}s/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      return response.json();
    },
    onSuccess: (_, { type }) => {
      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`,
      });
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/admin/${type}s`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEditDialog({ open: false, type: 'package', item: null });
      setEditForm({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (type: 'package' | 'product' | 'user', item: any) => {
    setEditDialog({ open: true, type, item });
    // Initialize form with current values
    if (type === 'package') {
      setEditForm({
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        isActive: item.isActive || false,
      });
    } else if (type === 'product') {
      setEditForm({
        name: item.name || '',
        description: item.description || '',
        price: item.price || 0,
        billingType: item.billingType || 'one-time',
        routePath: item.routePath || '',
        isActive: item.isActive || false,
      });
    } else if (type === 'user') {
      setEditForm({
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        email: item.email || '',
        companyName: item.companyName || '',
        isAdmin: item.isAdmin || false,
        isEmailVerified: item.isEmailVerified || false,
      });
    }
  };

  const handleEditSubmit = () => {
    if (editDialog.item && editForm) {
      editMutation.mutate({
        type: editDialog.type,
        id: editDialog.item.id,
        data: editForm,
      });
    }
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="heading-admin-dashboard">
                Admin Dashboard
              </h1>
              <p className="text-gray-400">
                Manage packages, products, and users for atomtools.ai
              </p>
            </div>
            <Link href="/admin/cms">
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-cms-management">
                <FileText className="w-4 h-4 mr-2" />
                CMS Management
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" defaultValue="overview">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900 border-gray-800">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2"
              data-testid="tab-overview"
            >
              <Settings className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="packages" 
              className="flex items-center gap-2"
              data-testid="tab-packages"
            >
              <Package className="h-4 w-4" />
              Packages
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="flex items-center gap-2"
              data-testid="tab-products"
            >
              <ShoppingCart className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2"
              data-testid="tab-users"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-packages">
                    {statsLoading ? "..." : (stats?.packageCount || (packages && Array.isArray(packages) ? packages.length : 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Product categories available
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-products">
                    {statsLoading ? "..." : (stats?.productCount || (products && Array.isArray(products) ? products.length : 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active tools and services
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-users">
                    {statsLoading ? "..." : (stats?.userCount || (users && Array.isArray(users) ? users.length : 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registered users
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Recent Packages</CardTitle>
                  <CardDescription>Latest package categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {packages && Array.isArray(packages) && packages.length > 0 ? (
                      packages.slice(0, 5).map((pkg: any) => (
                        <div key={pkg.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{pkg.name}</p>
                            <p className="text-sm text-gray-400">{pkg.category}</p>
                          </div>
                          <Badge variant={pkg.isActive ? "default" : "secondary"}>
                            {pkg.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))
                    ) : packagesLoading ? (
                      <p className="text-gray-400 text-sm">Loading...</p>
                    ) : (
                      <p className="text-gray-400 text-sm">No packages yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Recent Products</CardTitle>
                  <CardDescription>Latest tools and services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {products && Array.isArray(products) && products.length > 0 ? (
                      products.slice(0, 5).map((product: any) => (
                        <div key={product.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-400">
                              £{product.price} - {product.billingType}
                            </p>
                          </div>
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))
                    ) : productsLoading ? (
                      <p className="text-gray-400 text-sm">Loading...</p>
                    ) : (
                      <p className="text-gray-400 text-sm">No products yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="packages" className="space-y-6">
            {packageFormOpen ? (
              <PackageForm
                packageData={editingPackage}
                onSuccess={() => {
                  setPackageFormOpen(false);
                  setEditingPackage(undefined);
                }}
                onCancel={() => {
                  setPackageFormOpen(false);
                  setEditingPackage(undefined);
                }}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Package Management</h2>
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700" 
                    onClick={() => setPackageFormOpen(true)}
                    data-testid="button-add-package"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Package
                  </Button>
                </div>
                
                {packagesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading packages...</p>
                  </div>
                ) : packages && Array.isArray(packages) && packages.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {packages.map((pkg: PackageWithTiers) => (
                      <PackageCard
                        key={pkg.id}
                        packageData={pkg}
                        onEdit={(pkg) => {
                          setEditingPackage(pkg);
                          setPackageFormOpen(true);
                        }}
                        onDelete={(id) => handleDelete('package', { id })}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="text-center py-12">
                      <Package className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                      <h3 className="text-xl font-semibold text-white mb-2">No packages yet</h3>
                      <p className="text-gray-400 mb-6">Create your first package with tiers and product limits</p>
                      <Button 
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => setPackageFormOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Package
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Product Management</h2>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700" 
                data-testid="button-add-product"
                onClick={() => {
                  setEditingProduct(undefined);
                  setProductFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
            
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>Manage individual tools and services</CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading products...</p>
                  </div>
                ) : products && Array.isArray(products) && products.length > 0 ? (
                  <div className="space-y-4">
                    {products.map((product: any) => (
                      <div key={product.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800" data-testid={`product-item-${product.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <p className="text-gray-400 mt-1 line-clamp-2">{product.description}</p>
                            <div className="flex items-center gap-4 mt-3">
                              <Badge variant={product.isActive ? "default" : "secondary"}>
                                {product.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {product.routePath && (
                                <span className="text-sm text-gray-500">
                                  Route: {product.routePath}
                                </span>
                              )}
                              {product.availableSubfeatures && (
                                <div className="flex gap-1">
                                  {Object.entries(product.availableSubfeatures as Record<string, boolean>)
                                    .filter(([, enabled]) => enabled)
                                    .map(([feature]) => (
                                      <Badge key={feature} variant="outline" className="text-xs">
                                        {feature.replace('_', ' ')}
                                      </Badge>
                                    ))
                                  }
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Pricing configured at package tier level
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingProduct(product);
                                setProductFormOpen(true);
                              }}
                              data-testid={`button-edit-product-${product.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDelete('product', product)}
                              data-testid={`button-delete-product-${product.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No products found</p>
                    <p className="text-sm mt-1">Create your first product to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">User Management</h2>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-add-user">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
            
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading users...</p>
                  </div>
                ) : users && Array.isArray(users) && users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user: any) => (
                      <div key={user.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800" data-testid={`user-item-${user.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {user.firstName ? user.firstName[0] : user.email[0].toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}` 
                                    : user.username || user.email}
                                </h3>
                                <p className="text-gray-400 text-sm">{user.email}</p>
                                {user.companyName && (
                                  <p className="text-gray-500 text-xs">{user.companyName}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                              <Badge variant={user.isAdmin ? "default" : "secondary"}>
                                {user.isAdmin ? "Admin" : "User"}
                              </Badge>
                              <Badge variant={user.isEmailVerified ? "default" : "destructive"}>
                                {user.isEmailVerified ? "Verified" : "Unverified"}
                              </Badge>
                              <Badge variant={user.isProfileComplete ? "default" : "secondary"}>
                                {user.isProfileComplete ? "Complete" : "Incomplete"}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Joined: {new Date(user.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit('user', user)}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDelete('user', user)}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                    <p className="text-sm mt-1">No registered users yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Delete {deleteDialog.type.charAt(0).toUpperCase() + deleteDialog.type.slice(1)}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete "{deleteDialog.item?.name || deleteDialog.item?.email}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}
              disabled={deleteMutation.isPending}
              className="border-gray-600 text-white hover:bg-gray-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Edit {editDialog.type.charAt(0).toUpperCase() + editDialog.type.slice(1)}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Make changes to the {editDialog.type} information below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Package Form */}
            {editDialog.type === 'package' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <Input
                    id="name"
                    value={editForm.name || ''}
                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-edit-package-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={editForm.description || ''}
                    onChange={(e) => handleEditFormChange('description', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="textarea-edit-package-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-white">Category</Label>
                  <Input
                    id="category"
                    value={editForm.category || ''}
                    onChange={(e) => handleEditFormChange('category', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-edit-package-category"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={editForm.isActive || false}
                    onCheckedChange={(checked) => handleEditFormChange('isActive', checked)}
                    data-testid="switch-edit-package-active"
                  />
                  <Label htmlFor="isActive" className="text-white">Active</Label>
                </div>
              </>
            )}

            {/* Product Form */}
            {editDialog.type === 'product' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Name</Label>
                  <Input
                    id="name"
                    value={editForm.name || ''}
                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-edit-product-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={editForm.description || ''}
                    onChange={(e) => handleEditFormChange('description', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="textarea-edit-product-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-white">Price (£)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={editForm.price || 0}
                      onChange={(e) => handleEditFormChange('price', parseFloat(e.target.value) || 0)}
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="input-edit-product-price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingType" className="text-white">Billing Type</Label>
                    <Input
                      id="billingType"
                      value={editForm.billingType || ''}
                      onChange={(e) => handleEditFormChange('billingType', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="input-edit-product-billing-type"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routePath" className="text-white">Route Path</Label>
                  <Input
                    id="routePath"
                    value={editForm.routePath || ''}
                    onChange={(e) => handleEditFormChange('routePath', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-edit-product-route-path"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={editForm.isActive || false}
                    onCheckedChange={(checked) => handleEditFormChange('isActive', checked)}
                    data-testid="switch-edit-product-active"
                  />
                  <Label htmlFor="isActive" className="text-white">Active</Label>
                </div>
              </>
            )}

            {/* User Form */}
            {editDialog.type === 'user' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-white">First Name</Label>
                    <Input
                      id="firstName"
                      value={editForm.firstName || ''}
                      onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="input-edit-user-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-white">Last Name</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName || ''}
                      onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="input-edit-user-last-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-edit-user-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-white">Company Name</Label>
                  <Input
                    id="companyName"
                    value={editForm.companyName || ''}
                    onChange={(e) => handleEditFormChange('companyName', e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="input-edit-user-company-name"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isAdmin"
                      checked={editForm.isAdmin || false}
                      onCheckedChange={(checked) => handleEditFormChange('isAdmin', checked)}
                      data-testid="switch-edit-user-admin"
                    />
                    <Label htmlFor="isAdmin" className="text-white">Admin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isEmailVerified"
                      checked={editForm.isEmailVerified || false}
                      onCheckedChange={(checked) => handleEditFormChange('isEmailVerified', checked)}
                      data-testid="switch-edit-user-email-verified"
                    />
                    <Label htmlFor="isEmailVerified" className="text-white">Email Verified</Label>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditDialog({ ...editDialog, open: false });
                setEditForm({});
              }}
              disabled={editMutation.isPending}
              className="border-gray-600 text-white hover:bg-gray-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditSubmit}
              disabled={editMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-save-edit"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Form Dialog */}
      <ProductForm
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        product={editingProduct}
      />
    </div>
  );
}