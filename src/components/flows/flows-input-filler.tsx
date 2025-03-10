'use client'

import React, { useState, ChangeEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from 'react-i18next'
import { FlowInputType, FlowInputVariable } from '@/flows/models'

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

  // Helper function to load a file and encode it in base64:
  const handleFileBase64Change = async (
    e: ChangeEvent<HTMLInputElement>,
    variableName: string
  ) => {
    const file = e.target.files?.[0]
    if (!file) {
      handleValueChange(variableName, '')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const base64String = loadEvent.target?.result
      if (typeof base64String === 'string') {
        handleValueChange(variableName, base64String)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4 grid cols-2">
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

      {variables.filter(v => v.name).map((variable, index) => {
        const currentValue = values[variable.name] ?? ''
        const isRequired = variable.required
        let inputField: JSX.Element

        switch (variable.type) {
          case 'shortText':
          case 'url':
            inputField = (
              <Input
                className="text-sm"
                value={currentValue}
                onChange={(e) => handleValueChange(variable.name, e.target.value)}
                placeholder={variable.description || variable.name}
              />
            )
            break

          case 'fileBase64':
            inputField = (
              <Input
                type="file"
                className="text-sm"
                accept="text/*, image/png, image/jpeg, image/webp"
                onChange={(e) => handleFileBase64Change(e, variable.name)}
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
                className="text-sm"
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
                className="text-sm"
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
    </div>
  )
}
