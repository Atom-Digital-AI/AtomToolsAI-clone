import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Package, ShoppingCart, Users, Settings } from "lucide-react";
// import { PackageManager } from "@/components/admin/PackageManager";
// import { ProductManager } from "@/components/admin/ProductManager";
// import { UserManager } from "@/components/admin/UserManager";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch admin overview data
  const { data: stats, isLoading: statsLoading } = useQuery<{
    packageCount: number;
    productCount: number;
    userCount: number;
    activeSubscriptions: number;
  }>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["/api/admin/packages"],
    retry: false,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/admin/products"],
    retry: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

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

          <TabsContent value="packages">
            <div className="text-center py-8 text-gray-400">
              Package management coming soon
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="text-center py-8 text-gray-400">
              Product management coming soon
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="text-center py-8 text-gray-400">
              User management coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}