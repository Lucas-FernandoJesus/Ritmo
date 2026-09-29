import { paymentMethodLabels, paymentMethods } from '../../../core/domain'
import type { PaymentMethod } from '../../../core/types'
import { Field } from '../../../components/FormPrimitives'

export function PaymentMethodField({ value, onChange }: { value: PaymentMethod | ''; onChange: (value: PaymentMethod | '') => void }) {
  return <Field label="Forma de pagamento"><select value={value} onChange={(event) => onChange(event.target.value as PaymentMethod | '')}><option value="" hidden>Sem informação</option>{paymentMethods.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}</select></Field>
}
