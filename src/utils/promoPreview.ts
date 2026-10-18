import type { MenuItem, PromoOfferDraft } from '@/types';
import { buildPreviewDish, calculateDraftOfferTotals, createInitialOfferForm, getPromoMechanic, isOfferDraftValid, resolveDraftSubtitleCopy } from '@/utils/promoOffers';

const exampleDish: MenuItem = {
  id: 'preview-example-only', name: 'Plato de ejemplo', description: 'Presentación de ejemplo de una oferta Flash. No se publicará en la carta.',
  price: 40, image: '/logo.png', category: 'fondos', rating: 5, reviewsCount: 0,
};

export function buildSafePromoPreview(form: PromoOfferDraft, main: MenuItem | null, complement: MenuItem | null) {
  const needsComplement = getPromoMechanic(form.mechanic).requiresComplement;
  const validDish = (dish: MenuItem | null) => Boolean(dish && Number.isFinite(dish.price) && dish.price > 0 && dish.name.trim());
  const isExample = !form.mainDishId || !validDish(main) || main?.id !== form.mainDishId
    || (needsComplement && (!validDish(complement) || complement?.id !== form.complementaryDishId))
    || !isOfferDraftValid(form).valid;
  const previewForm: PromoOfferDraft = isExample
    ? { ...createInitialOfferForm(), mainDishId: exampleDish.id, isRecurring: true }
    : form;
  const previewMain = isExample ? exampleDish : main;
  const previewComplement = isExample ? null : complement;
  const totals = calculateDraftOfferTotals(previewForm, previewMain, previewComplement);
  return {
    isExample,
    deals: [{ ...buildPreviewDish(previewForm, previewMain, previewComplement), price: totals.precioOriginalTotal }],
    pricing: { originalPrice: totals.precioOriginalTotal, promoPrice: totals.precioFinalTotal,
      savings: totals.ahorroTotal, discountPercent: Math.round(totals.effectiveDiscountPercent) },
    copy: resolveDraftSubtitleCopy(previewForm, previewMain, previewComplement, totals.declaredDiscountPercent),
    complementImage: getPromoMechanic(previewForm.mechanic).requiresComplement ? previewComplement?.image ?? null : null,
  };
}
