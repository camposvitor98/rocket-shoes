import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const handleUpdateCart = (value: Product[]) => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(value));
    setCart(value);

    if (!value[0]) {
      localStorage.removeItem("@RocketShoes:cart");
    }
  };

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const alreadyExists = updatedCart.find(
        (product) => product.id === productId
      );

      if (alreadyExists) {
        const productStock = await api
          .get(`/stock/${productId}`)
          .then(({ data }) => data.amount);

        if (alreadyExists.amount < productStock) {
          alreadyExists.amount += 1;
        } else {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        handleUpdateCart(updatedCart);
      } else {
        api
          .get(`/products/${productId}`)
          .then(({ data }) => {
            if (data) {
              const newItem = { ...data, amount: 1 };
              updatedCart.push(newItem);

              handleUpdateCart([...cart, newItem]);
            } else {
              toast.error("Erro na adição do produto");
            }
          })
          .catch((err) => {
            toast.error("Erro na adição do produto");
          });
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);

      if (!!productExists) {
        const newCart = cart.filter((product) => product.id !== productId);
        handleUpdateCart(newCart);
      } else {
        toast.error("Erro na remoção do produto");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updatedCart = [...cart];

      const currentProduct = updatedCart.find(
        (product) => product.id === productId
      );

      if (!!currentProduct) {
        const productStock = await api
          .get(`/stock/${productId}`)
          .then(({ data }) => data.amount);

        if (amount > productStock) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        } else {
          if (amount > 0) {
            currentProduct.amount = amount;
            handleUpdateCart(updatedCart);
          } else {
            toast.error("Erro na alteração de quantidade do produto");
          }
        }
      } else {
        toast.error("Erro na alteração de quantidade do produto");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
