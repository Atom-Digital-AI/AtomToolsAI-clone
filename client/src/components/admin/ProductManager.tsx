import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ShoppingCart, Package } from "lucide-react";

interface Product {
  id: string;
  packageId: string;
  name: string;
  description: string;
  shortDescription?: string;
  features: string[];
  price: string;
  currency: string;
  billingType: string;
  isActive: boolean;
  routePath: string;
  marketingPath?: string;
  iconName?: string;
  tags: string[];
  package?: {
    id: string;
    name: string;
  };
}

export function ProductManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    packageId: "",
    name: "",
    description: "",
    shortDescription: "",
    features: [""],
    price: "",
    currency: "GBP",
    billingType: "one-time",
    isActive: true,
    routePath: "",
    marketingPath: "",
    iconName: "",
    tags: [""],
  });

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    retry: false,
  });

  const { data: packages } = useQuery<any[]>({
    queryKey: ["/api/admin/packages"],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (productData: any) => {
      const cleanData = {
        ...productData,
        features: productData.features.filter((f: string) => f.trim()),
        tags: productData.tags.filter((t: string) => t.trim()),
        price: parseFloat(productData.price),
      };
      return await apiRequest("POST", "/api/admin/products", cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & any) => {
      const cleanData = {
        ...data,
        features: data.features.filter((f: string) => f.trim()),
        tags: data.tags.filter((t: string) => t.trim()),
        price: parseFloat(data.price),
      };
      return await apiRequest("PUT", `/api/admin/products/${id}`, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setEditingProduct(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      packageId: "",
      name: "",
      description: "",
      shortDescription: "",
      features: [""],
      price: "",
      currency: "GBP",
      billingType: "one-time",
      isActive: true,
      routePath: "",
      marketingPath: "",
      iconName: "",
      tags: [""],
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      packageId: product.packageId,
      name: product.name,
      description: product.description,
      shortDescription: product.shortDescription || "",
      features: product.features.length ? product.features : [""],
      price: product.price,
      currency: product.currency,
      billingType: product.billingType,
      isActive: product.isActive,
      routePath: product.routePath,
      marketingPath: product.marketingPath || "",
      iconName: product.iconName || "",
      tags: product.tags.length ? product.tags : [""],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateArrayField = (field: 'features' | 'tags', index: number, value: string) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayField = (field: 'features' | 'tags') => {
    setFormData({ ...formData, [field]: [...formData[field], ""] });
  };

  const removeArrayField = (field: 'features' | 'tags', index: number) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray.length ? newArray : [""] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ProductForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="packageId">Package</Label>
          <Select value={formData.packageId} onValueChange={(value) => setFormData({ ...formData, packageId: value })}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-product-package">
              <SelectValue placeholder="Select a package" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {packages?.map((pkg: any) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            required
            data-testid="input-product-name"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
          rows={3}
          required
          data-testid="input-product-description"
        />
      </div>

      <div>
        <Label htmlFor="shortDescription">Short Description</Label>
        <Input
          id="shortDescription"
          value={formData.shortDescription}
          onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
          data-testid="input-product-short-description"
        />
      </div>

      <div>
        <Label>Features</Label>
        {formData.features.map((feature, index) => (
          <div key={index} className="flex gap-2 mt-2">
            <Input
              value={feature}
              onChange={(e) => updateArrayField('features', index, e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter feature"
              data-testid={`input-product-feature-${index}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeArrayField('features', index)}
              data-testid={`button-remove-feature-${index}`}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addArrayField('features')}
          className="mt-2"
          data-testid="button-add-feature"
        >
          Add Feature
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            required
            data-testid="input-product-price"
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-product-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="billingType">Billing Type</Label>
          <Select value={formData.billingType} onValueChange={(value) => setFormData({ ...formData, billingType: value })}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="select-product-billing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="one-time">One-time</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="routePath">Route Path</Label>
          <Input
            id="routePath"
            value={formData.routePath}
            onChange={(e) => setFormData({ ...formData, routePath: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            placeholder="/app/tools/example"
            required
            data-testid="input-product-route-path"
          />
        </div>
        <div>
          <Label htmlFor="marketingPath">Marketing Path</Label>
          <Input
            id="marketingPath"
            value={formData.marketingPath}
            onChange={(e) => setFormData({ ...formData, marketingPath: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            placeholder="/tools/example"
            data-testid="input-product-marketing-path"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="iconName">Icon Name (Lucide)</Label>
        <Input
          id="iconName"
          value={formData.iconName}
          onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
          placeholder="e.g., Zap, Target, BarChart"
          data-testid="input-product-icon"
        />
      </div>

      <div>
        <Label>Tags</Label>
        {formData.tags.map((tag, index) => (
          <div key={index} className="flex gap-2 mt-2">
            <Input
              value={tag}
              onChange={(e) => updateArrayField('tags', index, e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter tag"
              data-testid={`input-product-tag-${index}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeArrayField('tags', index)}
              data-testid={`button-remove-tag-${index}`}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addArrayField('tags')}
          className="mt-2"
          data-testid="button-add-tag"
        >
          Add Tag
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          data-testid="switch-product-active"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            editingProduct ? setEditingProduct(null) : setIsCreateOpen(false);
            resetForm();
          }}
          data-testid="button-cancel-product"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-save-product"
        >
          {editingProduct
            ? updateMutation.isPending ? "Updating..." : "Update Product"
            : createMutation.isPending ? "Creating..." : "Create Product"
          }
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-product-manager">Product Management</h2>
          <p className="text-gray-400">Manage individual tools and services</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-create-product">
              <Plus className="h-4 w-4" />
              Create Product
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
              <DialogDescription>
                Add a new product or service to your platform.
              </DialogDescription>
            </DialogHeader>
            <ProductForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product: Product) => (
          <Card key={product.id} className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </div>
                <Badge variant={product.isActive ? "default" : "secondary"}>
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardDescription>
                {product.package?.name && (
                  <div className="flex items-center gap-1 mb-1">
                    <Package className="h-3 w-3" />
                    {product.package.name}
                  </div>
                )}
                {product.shortDescription || product.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Price:</span>
                  <span className="font-medium">
                    {product.currency} £{product.price} ({product.billingType})
                  </span>
                </div>
                {product.features.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-400">Features:</span>
                    <ul className="text-xs text-gray-300 mt-1">
                      {product.features.slice(0, 3).map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                      {product.features.length > 3 && (
                        <li>• +{product.features.length - 3} more...</li>
                      )}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(product)}
                    data-testid={`button-edit-product-${product.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(product.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-product-${product.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) || (
          <div className="col-span-full text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No products yet</h3>
            <p className="text-gray-500">Create your first product to get started.</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information.
            </DialogDescription>
          </DialogHeader>
          <ProductForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}