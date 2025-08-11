import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, ShoppingCart, Users, Settings, Trash2, Edit } from "lucide-react";
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

  const handleEdit = (type: 'package' | 'product' | 'user', item: any) => {
    // TODO: Implement edit functionality with modal forms
    toast({
      title: "Feature Coming Soon",
      description: `Edit ${type} functionality will be implemented next`,
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-admin-dashboard">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">
            Manage packages, products, and users for atomtools.ai
          </p>
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Package Management</h2>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-add-package">
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </div>
            
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>All Packages</CardTitle>
                <CardDescription>Manage product categories and package definitions</CardDescription>
              </CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading packages...</p>
                  </div>
                ) : packages && Array.isArray(packages) && packages.length > 0 ? (
                  <div className="space-y-4">
                    {packages.map((pkg: any) => (
                      <div key={pkg.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800" data-testid={`package-item-${pkg.id}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{pkg.name}</h3>
                            <p className="text-gray-400 mt-1">{pkg.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="outline">{pkg.category}</Badge>
                              <Badge variant={pkg.isActive ? "default" : "secondary"}>
                                {pkg.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Created: {new Date(pkg.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEdit('package', pkg)}
                              data-testid={`button-edit-package-${pkg.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDelete('package', pkg)}
                              data-testid={`button-delete-package-${pkg.id}`}
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
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No packages found</p>
                    <p className="text-sm mt-1">Create your first package to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Product Management</h2>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="button-add-product">
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
                              <div className="text-lg font-bold text-green-400">
                                £{product.price}
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {product.billingType.replace('-', ' ')}
                              </Badge>
                              <Badge variant={product.isActive ? "default" : "secondary"}>
                                {product.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {product.routePath && (
                                <span className="text-sm text-gray-500">
                                  Route: {product.routePath}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit('product', product)}
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
    </div>
  );
}