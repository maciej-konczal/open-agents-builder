'use client'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrashIcon, VariableIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FlowInputType, FlowInputVariable, INPUT_TYPES } from '@/flows/models'


// Prosty regex do walidacji nazwy zmiennej:
const variableNameRegex = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/

interface FlowInputVariablesEditorProps {
  variables: FlowInputVariable[]
  onChange: (updated: FlowInputVariable[]) => void
}

export function FlowInputVariablesEditor({
  variables,
  onChange,
}: FlowInputVariablesEditorProps) {
// Function to create a new variable with default values
  const createNewVariable = (): FlowInputVariable => ({
    name: '',
    description: '',
    required: false,
    type: 'shortText',
  })

  const { t } = useTranslation();



// Adding a new variable
  const handleAddVariable = () => {
    onChange([...variables, createNewVariable()])
  }

// Deleting a variable
  const handleDeleteVariable = (index: number) => {
    const updated = variables.filter((_, i) => i !== index)
    onChange(updated)
  }

// Updating fields in an existing variable
  const updateVariable = (index: number, updatedFields: Partial<FlowInputVariable>) => {
    const newList = [...variables]
    newList[index] = { ...newList[index], ...updatedFields }
    onChange(newList)
  }

  return (
    <div>
      <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 xxl:grid-cols-4 gap-2">
        {variables.map((variable, index) => {
          // We will validate the variable name
          const isNameValid = (variable.name !== '' || variableNameRegex.test(variable.name)) && variables.filter(v=>v.name === variable.name).length <= 1

          return (
            <Card key={index} className="p-4 border space-y-3">
              {/* Nazwa zmiennej */}
              <div className="space-y-2">
                <Label className="block text-sm">{t('Symbol')}:</Label>
                <Input
                  value={variable.name}
                  onChange={(e) => updateVariable(index, { name: e.target.value })}
                  placeholder={t("eg. userEmail")}
                />
                {!isNameValid && (
                  <p className="text-red-500 text-sm mt-1">
                    {t('The provided name is not a valid symbol (np. userEmail, _count, $value) or is not unique.')}
                  </p>
                )}
              </div>

              {/* Opis */}
              <div className="space-y-2">
                <Label className="block text-sm">{t('Description (optional)')}</Label>
                <Input
                  value={variable.description || ''}
                  onChange={(e) => updateVariable(index, { description: e.target.value })}
                  placeholder={t('eg. user e-mail')}
                />
              </div>

              <div className="flex justify-between">
                {/* Typ */}
                <div className="space-y-2 flex items-center space-x-2">
                  <Label className="block text-sm">{t('Type')}:</Label>
                  <select
                    className="border p-2 rounded text-sm"
                    value={variable.type}
                    onChange={(e) =>
                      updateVariable(index, { type: e.target.value as FlowInputType })
                    }
                  >
                    {INPUT_TYPES.map((it) => (
                      <option key={it.type} value={it.type}>
                        {t(it.label)}
                      </option>
                    ))}
                  </select>
                  <input
                    id={`required-checkbox-${index}`}
                    type="checkbox"
                    checked={variable.required}
                    onChange={(e) => updateVariable(index, { required: e.target.checked })}
                  />
                  <Label htmlFor={`required-checkbox-${index}`}>{t('Required')}</Label>            
                </div>

                <div className="items-end flex w-fit justify-end items-center">
                    <Button  title={t('Remove input')} variant="outline" onClick={() => handleDeleteVariable(index)}>
                    <TrashIcon className="w-4 h-4" />
                    </Button>
                </div>  
              </div>            
            </Card>
          )
        })}
      </div>

      <div className="mt-4">
        <Button variant="outline"  onClick={handleAddVariable}><VariableIcon className="w-4 h-4" /> {t('Add input')}</Button>
      </div>
    </div>
  )
}
