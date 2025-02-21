import { useTranslation } from "react-i18next"

export function Price ({ price, currency, className }: { price?: number, currency: string, className?: string }) {
    const { t } = useTranslation()
    return (
        <span className={className}>
        {price ? price.toFixed(2) : t('N/A')} {currency}
        </span>
    )
}