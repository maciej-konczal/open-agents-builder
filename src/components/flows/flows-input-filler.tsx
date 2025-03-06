'use client'

import React, { useState, ChangeEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { FlowInputType, FlowInputVariable } from '@/flows/models'
import { Textarea } from '@/components/ui/textarea'

interface FlowInputValuesFillerProps {
  variables: FlowInputVariable[]
  initialValues?: Record<string, any>
  onChange?: (values: Record<string, any> | string) => void
}

export function FlowInputValuesFiller({
  variables,
  initialValues = {},
  onChange,
}: FlowInputValuesFillerProps) {
  const { t } = useTranslation()

  const [values, setValues] = useState<Record<string, any>>(initialValues)
  const handleValueChange = (name: string, newValue: any) => {
    if (name) {
        const updated = { ...values, [name]: newValue }
        setValues(updated)
        onChange?.(updated)
    } else {
        onChange?.(newValue ?? '')
    }
  }

  const parseNumber = (value: string): number | undefined => {
    if (value.trim() === '') return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  if (!variables || variables.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm italic">{t('No inputs to fill.')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
        {variables.length === 0 && (
          <Card key='request-body' className="p-4 space-y-2 border">
          <Label className="text-sm font-semibold">
            {t('Flow input')}
          </Label>
            <p className="text-xs text-gray-600">{t('Flow input')}</p>
            <Textarea
              className="border rounded px-3 py-2 text-sm w-full"
              rows={4}
              placeholder={t('Input data - can be JSON, or just text')}
              onChange={(e) => handleValueChange('', e.target.value)}
            />         
            </Card>   
        )}
      {variables.map((variable, index) => {
        const currentValue = values[variable.name] ?? ''
        const isRequired = variable.required
        let inputField: JSX.Element

        switch (variable.type) {
          case 'shortText':
          case 'url':
          case 'fileBase64':
            inputField = (
              <Input
                value={currentValue}
                onChange={(e) => handleValueChange(variable.name, e.target.value)}
                placeholder={variable.description || variable.name}
                // Dla fileBase64 możesz też wstawić:
                // type="file" i w onChange wczytywać plik jako Base64
                // type="file" np. z FileReader
                type={variable.type === 'fileBase64' ? 'text' : 'text'}
              />
            )
            break

          case 'longText':
          case 'json':
            inputField = (
              <Textarea
                className="border rounded px-3 py-2 text-sm w-full"
                rows={4}
                value={currentValue}
                placeholder={variable.description || variable.name}
                onChange={(e) => handleValueChange(variable.name, e.target.value)}
              />
            )
            break

          case 'number':
            inputField = (
              <Input
                type="number"
                value={currentValue}
                placeholder={variable.description || variable.name}
                onChange={(e) =>
                  handleValueChange(variable.name, parseNumber(e.target.value))
                }
              />
            )
            break

          default:
            inputField = (
              <Textarea
                rows={4}
                value={currentValue}
                onChange={(e) => handleValueChange(variable.name, e.target.value)}
              />
            )
        }

        return (
          <Card key={index} className="p-4 space-y-2 border">
            <Label className="text-sm font-semibold">
              {variable.name}
              {isRequired && (
                <span className="text-red-500 ml-1">({t('required')})</span>
              )}
            </Label>
            {variable.description && (
              <p className="text-xs text-gray-600">{variable.description}</p>
            )}

            {inputField}
          </Card>
        )
      })}

      <div className="pt-2">
        <Button
          variant="outline"
          onClick={() => {
            console.log('Current input values:', values)
          }}
        >
          {t('Show values in console')}
        </Button>
      </div>
    </div>
  )
}