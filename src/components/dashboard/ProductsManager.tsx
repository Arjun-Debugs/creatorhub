import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import { productSchema } from "@/lib/validation";
import ProductEditor from "./ProductEditor";

export default function ProductsManager({ onProductChange }: { onProductChange?: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error fetching products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setEditorOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast.error("Error deleting product");
    } else {
      toast.success("Product deleted");
      fetchProducts();
      onProductChange?.();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">My Products</h2>
          <p className="text-muted-foreground">Manage your product listings</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </div>

      {products.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You haven't added any products yet.</p>
            <Button onClick={handleOpenCreate}>Add Your First Product</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="shadow-soft hover:shadow-hover transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-primary">${product.price}</span>
                  <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                    {product.type}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        product={editingProduct}
        onSuccess={() => {
          fetchProducts();
          onProductChange?.();
        }}
      />
    </div>
  );
}